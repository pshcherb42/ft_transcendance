'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { PongRenderer } from './renderer';
import { PongMatch } from './PongMatch';
import { TournamentView } from './TournamentView';
import { WIDTH, HEIGHT } from './constants';
import { type MapId } from './config';
import type { Difficulty } from './ai';
import type { GameSnapshot, Mode, Side } from './types';
import { useSocket } from '@/context/SocketContext';
import { decode } from '@msgpack/msgpack';

type OnlineStatus = 'connecting' | 'waiting' | 'playing' | 'gameover' | 'opponent-left';


export default function GamePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get('mode');
  const difficultyParam = searchParams.get('difficulty');
  const mapParam = searchParams.get('map');
  const powerupsParam = searchParams.get('powerups');

  const canvasRef = useRef<HTMLCanvasElement>(null); // solo modo online
  const rendererRef = useRef(new PongRenderer());

  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mode: Mode =
    modeParam === 'online' ||
    modeParam === 'local' ||
    modeParam === 'ai' ||
    modeParam === 'tournament'
      ? modeParam
      : 'local';

  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('connecting');
  const [side, setSide] = useState<Side | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [onlineRound, setOnlineRound] = useState(0);

  // Modo LOCAL / IA
  const [localWinner, setLocalWinner] = useState<Side | null>(null);
  const [localRound, setLocalRound] = useState(0);
  const [difficulty] = useState<Difficulty>(() => {
    if (
      difficultyParam === 'easy' ||
      difficultyParam === 'medium' ||
      difficultyParam === 'hard'
    ) {
      return difficultyParam;
    }
  
    return 'medium';
  });
  
  const [mapId] = useState<MapId>(() => {
    if (
      mapParam === 'classic' ||
      mapParam === 'obstacles'
    ) {
      return mapParam;
    }
  
    return 'classic';
  });
  
  const [powerups] = useState(
    () => powerupsParam === 'true',
  );

  const [score, setScore] = useState({
    left: 0,
    right: 0,
  });
  
  const [, setCountdown] = useState(0);
  const socket = useSocket();

  const DIFF_LABEL: Record<Difficulty, string> = {
    easy: t('game.difficulty.easy'),
    medium: t('game.difficulty.medium'),
    hard: t('game.difficulty.hard'),
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    const isValidMode =
      modeParam === 'online' ||
      modeParam === 'local' ||
      modeParam === 'ai' ||
      modeParam === 'tournament';
  
    if (!isValidMode) {
      router.replace('/');
    }
  }, [modeParam, router]);

  useEffect(() => {
    if (!socket) return;
    const onInviteAccepted = () => {
      setOnlineRound((r) => r + 1);
      setMode('online');
    };
    socket.on('gameInviteAccepted', onInviteAccepted);
    return () => { socket.off('gameInviteAccepted', onInviteAccepted); };
  }, [socket]);

  // ----------------------------------------------------------------- ONLINE
  useEffect(() => {
    if (mode !== 'online' || !socket) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = rendererRef.current;
    const canvasLabels = {
      getReady: t('game.canvas.getReady'),
      youWin: t('game.canvas.youWin'),
      youLose: t('game.canvas.youLose'),
      leftWins: t('game.canvas.leftWins'),
      rightWins: t('game.canvas.rightWins'),
    };
    setOnlineStatus('connecting');
    setSide(null);
    setWinner(null);
    setScore({
      left: 0,
      right: 0,
    });

    let snapshot: GameSnapshot | null = null;
    let mySide: Side | null = null;

    const onConnect = () => {
      setOnlineStatus('connecting');
      socket.emit('checkRoom');
    };

    const onNoActiveGame = () => {
      setOnlineStatus('waiting');
      socket.emit('joinQueue');
    };

    const onWaiting = () => setOnlineStatus('waiting');
    const onRejoined = (data: { roomId: string; side: Side }) => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setReconnectSecondsLeft(null);
      mySide = data.side;
      setSide(data.side);
      setWinner(null);
      setOnlineStatus('playing');
    };

    const onMatchFound = (data: { side: Side }) => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setReconnectSecondsLeft(null);
      mySide = data.side;
      setSide(data.side);
      setWinner(null);
      setOnlineStatus('playing');
    };

    const onGameState = (payload: Uint8Array) => {
      const state = decode(payload) as GameSnapshot;
      snapshot = state;

      setCountdown((currentCountdown) => {
        if (currentCountdown === state.countdown) {
          return currentCountdown;
        }
      
        return state.status === 'countdown' ? state.countdown : 0;
      });
    
      setScore((currentScore) => {
        if (
          currentScore.left === state.scoreLeft &&
          currentScore.right === state.scoreRight
        ) {
          return currentScore;
        }
    
        return {
          left: state.scoreLeft,
          right: state.scoreRight,
        };
      });
    };

    const onGameOver = (data: { winner: Side }) => {
      setWinner(data.winner);
      setOnlineStatus('gameover');
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };

    const onOpponentLeft = () => setOnlineStatus('opponent-left');

    const onOpponentDisconnected = (data: { userId: string; gracePeriodMs: number }) => {
      const deadline = Date.now() + data.gracePeriodMs;
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = setInterval(() => {
        const msLeft = deadline - Date.now();
        setReconnectSecondsLeft(Math.max(0, Math.ceil(msLeft / 1000)));
        if (msLeft <= 0 && disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
      }, 250);
    };

    const onMatchVoided = () => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setReconnectSecondsLeft(null);
      setOnlineStatus('opponent-left');
      setWinner(null);
    };

    const onOpponentReconnected = () => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setReconnectSecondsLeft(null);
    };

    socket.on('connect', onConnect);
    socket.on('waiting', onWaiting);
    socket.on('rejoinedGame', onRejoined);
    socket.on('noActiveGame', onNoActiveGame);
    socket.on('matchFound', onMatchFound);
    socket.on('gameState', onGameState);
    socket.on('gameOver', onGameOver);
    socket.on('opponentLeft', onOpponentLeft);
    socket.on('opponentDisconnected', onOpponentDisconnected);
    socket.on('matchVoided', onMatchVoided);
    socket.on('opponentReconnected', onOpponentReconnected);

    if (socket.connected) onConnect();

    const pressed = new Set<string>();
    let currentDir: 'up' | 'down' | 'stop' = 'stop';
    const refresh = () => {
      const up = pressed.has('up');
      const down = pressed.has('down');
      const dir = up && !down ? 'up' : down && !up ? 'down' : 'stop';
      if (dir === currentDir) return;
      currentDir = dir;
      socket.emit('paddleInput', { dir });
    };
    const keyToAction = (k: string): 'up' | 'down' | null => {
      if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up';
      if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
      return null;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const a = keyToAction(e.key);
      if (!a) return;
      e.preventDefault();
      pressed.add(a);
      refresh();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const a = keyToAction(e.key);
      if (!a) return;
      pressed.delete(a);
      refresh();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let raf: number;
    const loop = () => {
      if (snapshot) renderer.draw(ctx, snapshot, mySide ?? undefined, canvasLabels);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setReconnectSecondsLeft(null);
      socket.off('connect', onConnect);
      socket.off('waiting', onWaiting);
      socket.off('rejoinedGame', onRejoined);
      socket.off('matchFound', onMatchFound);
      socket.off('gameState', onGameState);
      socket.off('gameOver', onGameOver);
      socket.off('opponentLeft', onOpponentLeft);
      socket.off('opponentDisconnected', onOpponentDisconnected);
      socket.off('matchVoided', onMatchVoided);
      socket.off('opponentReconnected', onOpponentReconnected);
      socket.off('noActiveGame', onNoActiveGame);
    };
  }, [mode, onlineRound, socket, t]);

  // --------------------------------------------------------------- UI helpers
  const onlineStatusText = (() => {
    switch (onlineStatus) {
      case 'connecting': return t('game.status.connecting');
      case 'waiting': return t('game.status.waiting');
      case 'playing':
        return side === 'left' ? t('game.status.playingLeft') : t('game.status.playingRight');
      case 'gameover':
        return winner === side ? t('game.status.won') : t('game.status.lost');
      case 'opponent-left':
        return t('game.status.opponentLeft');
    }
  })();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <p className="text-zinc-300 text-sm">{t('game.loading')}</p>
      </div>
    );
  }

  // --------------------------------------------------------------- TORNEO
  if (mode === 'tournament') {
    return (
      <TournamentView
        onExit={() => router.push('/')}
      />
    );
  }

  const handleBackToMenu = () => {
    if (mode === 'online' && socket) {
      socket.emit('leaveGame');
    }
  
    if (disconnectTimerRef.current) {
      clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  
    setReconnectSecondsLeft(null);
    setWinner(null);
    setLocalWinner(null);
    setScore({
      left: 0,
      right: 0,
    });
  
    router.push('/');
  };

  // ------------------------------------------------------ ONLINE / LOCAL / IA
  const isGameFinished =
  mode === 'online'
    ? onlineStatus === 'gameover' || onlineStatus === 'opponent-left'
    : localWinner !== null;

const resultTitle = (() => {
  if (mode === 'online') {
    if (onlineStatus === 'opponent-left') {
      return 'YOU WON';
    }

    return winner === side ? 'YOU WON' : 'YOU LOST';
  }

  if (mode === 'ai') {
    return localWinner === 'left' ? 'YOU WON' : 'AI WON';
  }

  return localWinner === 'left'
    ? 'PLAYER ONE WON'
    : 'PLAYER TWO WON';
})();

const gameTitle =
  mode === 'online'
    ? t('game.title.online')
    : mode === 'ai'
      ? t('game.title.ai')
      : t('game.title.local');

const leftPlayerName =
  mode === 'online'
    ? side === 'left'
      ? user.username
      : 'Opponent'
    : mode === 'ai'
      ? user.username
      : 'Player one';

const rightPlayerName =
  mode === 'online'
    ? side === 'right'
      ? user.username
      : 'Opponent'
    : mode === 'ai'
      ? 'AI'
      : 'Player two';

return (
  <div className="flex min-h-[calc(100dvh-48px)] flex-col bg-[#F7F5F1]">
    <main className="flex flex-1">
      <section
        className="
          flex
          w-full
          flex-col
          bg-[#F7F5F1]
          px-6
          pb-10
          pt-12
          md:px-16
          md:pt-16
        "
      >
        {/* Верхняя часть */}
        <div className="relative flex min-h-[70px] items-start justify-center">
          <button
            type="button"
            onClick={handleBackToMenu}
            className="
              absolute
              left-0
              top-0
              h-[46px]
              min-w-[185px]
              rounded-full
              border-[1.5px]
              border-[#D9D5D1]
              px-7
              text-[13px]
              font-medium
              uppercase
              text-[#615050]
              transition-colors
              hover:border-[#615050]
              hover:bg-[#D9D9D9]/20
            "
          >
            Back to menu
          </button>

          <div className="flex flex-col items-center text-center">
          <h1
            className="
              font-display
              text-[clamp(2.8rem,5vw,64px)]
              uppercase
              leading-none
              text-brand-red
            "
          >
            {gameTitle}
          </h1>

          {mode === 'online' &&
            !isGameFinished &&
            onlineStatus !== 'playing' && (
              <p
                className="
                  mt-3
                  text-[13px]
                  font-medium
                  uppercase
                  tracking-[0.12em]
                  text-[#615050]
                "
              >
                {onlineStatusText}
              </p>
            )}

          {mode === 'online' &&
            !isGameFinished &&
            reconnectSecondsLeft !== null && (
              <p
                className="
                  mt-2
                  text-[13px]
                  font-medium
                  text-brand-red
                "
              >
                Opponent disconnected — victory in {reconnectSecondsLeft}s
              </p>
            )}
        </div>
        </div>

        {/* Карточка игры */}
        <div
          className="
            mx-auto
            mt-4
            w-full
            max-w-[1085px]
            rounded-[14px]
            bg-white
            px-5
            pb-5
            pt-4
            md:px-6
          "
        >
          {/* Игроки и счёт */}
          <div
            className="
              grid
              grid-cols-[1fr_auto_1fr]
              items-end
              gap-4
              pb-4
            "
          >
            <div>
              <p
                className="
                  text-[12px]
                  font-medium
                  uppercase
                  tracking-[0.12em]
                  text-[#262121]
                "
              >
                Player one
              </p>

              <p className="mt-2 text-[20px] font-semibold text-black">
                {leftPlayerName}
              </p>
            </div>

            <div
              className="
                flex
                items-center
                gap-4
                text-[44px]
                font-semibold
                leading-none
                text-black
              "
            >
              <span>{score.left}</span>
              <span className="text-[30px] text-[#777171]">:</span>
              <span>{score.right}</span>
            </div>

            <div className="text-right">
              <p
                className="
                  text-[12px]
                  font-medium
                  uppercase
                  tracking-[0.12em]
                  text-[#262121]
                "
              >
                Player two
              </p>

              <p className="mt-2 text-[20px] font-semibold text-black">
                {rightPlayerName}
              </p>
            </div>
          </div>

          {/* Canvas */}
          <div className="relative overflow-hidden rounded-[14px] bg-[#171717]">
            {mode === 'online' ? (
              <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                className="block h-auto w-full bg-[#171717]"
              />
            ) : (
              <PongMatch
                key={localRound}
                config={{ map: mapId, powerups }}
                vsAi={mode === 'ai'}
                difficulty={difficulty}
                onScoreChange={setScore}
                onFinish={setLocalWinner}
              />
            )}

            {isGameFinished && (
              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-center
                  bg-black/55
                  px-5
                "
              >
                <div
                  className="
                    flex
                    w-full
                    max-w-[430px]
                    flex-col
                    items-center
                    rounded-[20px]
                    bg-[#F7F5F1]
                    px-8
                    py-9
                    text-center
                    shadow-[0_24px_70px_rgba(0,0,0,0.35)]
                  "
                >
                  <p
                    className="
                      text-[12px]
                      font-medium
                      uppercase
                      tracking-[0.14em]
                      text-[#615050]
                    "
                  >
                    Final score
                  </p>

                  <h2
                    className="
                      mt-3
                      font-display
                      text-[clamp(2.5rem,5vw,58px)]
                      uppercase
                      leading-none
                      text-brand-red
                    "
                  >
                    {resultTitle}
                  </h2>

                  <div
                    className="
                      mt-6
                      flex
                      items-center
                      gap-5
                      text-[48px]
                      font-semibold
                      leading-none
                      text-black
                    "
                  >
                    <span>{score.left}</span>
                    <span className="text-[30px] text-[#918787]">:</span>
                    <span>{score.right}</span>
                  </div>

                  <p className="mt-4 text-[14px] text-[#615050]">
                    {leftPlayerName} · {rightPlayerName}
                  </p>

                  {mode === 'online' ? (
                    <button
                      type="button"
                      onClick={() => setOnlineRound((round) => round + 1)}
                      className="
                        mt-8
                        h-[52px]
                        w-full
                        rounded-full
                        bg-brand-green
                        px-8
                        text-[13px]
                        font-medium
                        uppercase
                        tracking-[0.08em]
                        text-white
                        transition-colors
                        hover:bg-[#808979]
                      "
                    >
                      Find another game
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalWinner(null);
                        setScore({
                          left: 0,
                          right: 0,
                        });
                        setLocalRound((round) => round + 1);
                      }}
                      className="
                        mt-8
                        h-[52px]
                        w-full
                        rounded-full
                        bg-brand-green
                        px-8
                        text-[13px]
                        font-medium
                        uppercase
                        tracking-[0.08em]
                        text-white
                        transition-colors
                        hover:bg-[#808979]
                      "
                    >
                      Rematch
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleBackToMenu}
                    className="
                      mt-3
                      h-[48px]
                      w-full
                      rounded-full
                      border-[1.5px]
                      border-[#D9D5D1]
                      px-8
                      text-[13px]
                      font-medium
                      uppercase
                      tracking-[0.08em]
                      text-[#615050]
                      transition-colors
                      hover:border-[#615050]
                      hover:bg-[#D9D9D9]/30
                    "
                  >
                    Back to menu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Информация под игровым полем */}
          {mode !== 'online' && !isGameFinished && (
            <div className="mx-auto mt-5 min-h-[28px] text-center">
              <p className="text-[14px] text-[#615050]">
                {mode === 'ai'
                  ? `Difficulty: ${DIFF_LABEL[difficulty]}`
                  : 'Player one: W / S · Player two: ↑ / ↓'}
              </p>
            </div>
          )}
      </section>
    </main>
  </div>
);
}