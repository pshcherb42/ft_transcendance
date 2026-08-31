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

type OnlineStatus =
  'connecting' | 'waiting' | 'playing' | 'gameover' | 'opponent-left';

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

  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<
    number | null
  >(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

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
  const [opponentUsername, setOpponentUsername] = useState<string | null>(null);
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
    if (mapParam === 'classic' || mapParam === 'obstacles') {
      return mapParam;
    }

    return 'classic';
  });

  const [powerups] = useState(() => powerupsParam === 'true');

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

    // let snapshot: GameSnapshot | null = null;
    let mySide: Side | null = null;
    let prevFrame: { t: number; s: GameSnapshot } | null = null;
    let nextFrame: { t: number; s: GameSnapshot } | null = null;

    const INTERP_SNAP_MS = 200;
    const lerp = (a: number, b: number, alpha: number) => a + (b - a) * alpha;
    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

    function interpolateSnapshots(
      prev: GameSnapshot,
      next: GameSnapshot,
      alpha: number,
    ): GameSnapshot {
      const balls =
        prev.balls && next.balls && prev.balls.length === next.balls.length
          ? next.balls.map((b, i) => ({
              x: lerp(prev.balls![i].x, b.x, alpha),
              y: lerp(prev.balls![i].y, b.y, alpha),
            }))
          : next.balls;

      return {
        ...next,
        leftPaddleY: lerp(prev.leftPaddleY, next.leftPaddleY, alpha),
        rightPaddleY: lerp(prev.rightPaddleY, next.rightPaddleY, alpha),
        ballX: lerp(prev.ballX, next.ballX, alpha),
        ballY: lerp(prev.ballY, next.ballY, alpha),
        balls,
      };
    }

    const onConnect = () => {
      setOnlineStatus('connecting');
      socket.emit('checkRoom');
    };

    const onNoActiveGame = () => {
      setOnlineStatus('waiting');
      socket.emit('joinQueue');
    };

    const onWaiting = () => setOnlineStatus('waiting');
    const onRejoined = (data: {
      roomId: string;
      side: Side;
      opponentUsername: string | null;
    }) => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      setReconnectSecondsLeft(null);

      mySide = data.side;
      setSide(data.side);
      setOpponentUsername(data.opponentUsername);
      setWinner(null);
      setOnlineStatus('playing');
    };

    const onMatchFound = (data: {
      roomId: string;
      side: Side;
      opponent: {
        id: string;
        email: string;
        username?: string;
      };
    }) => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      setReconnectSecondsLeft(null);

      mySide = data.side;
      setSide(data.side);
      setOpponentUsername(data.opponent.username ?? null);
      setWinner(null);
      setOnlineStatus('playing');
    };

    const onGameState = (payload: Uint8Array) => {
      const state = decode(payload) as GameSnapshot;
      // snapshot = state;
      const now = performance.now();
      const snap =
        prevFrame &&
        (state.scoreLeft !== prevFrame.s.scoreLeft ||
          state.scoreRight !== prevFrame.s.scoreRight ||
          state.status !== prevFrame.s.status);

      if (!prevFrame || snap) {
        prevFrame = null;
        nextFrame = { t: now, s: state };
      } else {
        prevFrame = nextFrame;
        nextFrame = { t: now, s: state };
      }

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

    const onOpponentDisconnected = (data: {
      userId: string;
      gracePeriodMs: number;
    }) => {
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
    // const loop = () => {
    //   if (snapshot)
    //     renderer.draw(ctx, snapshot, mySide ?? undefined, canvasLabels);
    //   raf = requestAnimationFrame(loop);
    // };
    // loop();
    const loop = (ts?: number) => {
      const now = ts ?? performance.now();
      if (nextFrame) {
        if (prevFrame && nextFrame.t > prevFrame.t) {
          const gap = nextFrame.t - prevFrame.t;

          const renderTime = now - gap;
          const alpha = clamp01((renderTime - prevFrame.t) / gap);

          const drawable =
            gap > INTERP_SNAP_MS
              ? nextFrame.s
              : interpolateSnapshots(prevFrame.s, nextFrame.s, alpha);

          renderer.draw(ctx, drawable, mySide ?? undefined, canvasLabels);
        } else {
          renderer.draw(ctx, nextFrame.s, mySide ?? undefined, canvasLabels);
        }
      }
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
      case 'connecting':
        return t('game.status.connecting');
      case 'waiting':
        return t('game.status.waiting');
      case 'playing':
        return side === 'left'
          ? t('game.status.playingLeft')
          : t('game.status.playingRight');
      case 'gameover':
        return winner === side ? t('game.status.won') : t('game.status.lost');
      case 'opponent-left':
        return t('game.status.opponentLeft');
    }
  })();

  if (loading || !user) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-900'>
        <p className='text-zinc-300 text-sm'>{t('game.loading')}</p>
      </div>
    );
  }

  // --------------------------------------------------------------- TORNEO
  if (mode === 'tournament') {
    return <TournamentView onExit={() => router.push('/')} />;
  }

  const handleBackToMenu = () => {
    if (mode === 'online' && socket && !isGameFinished) {
      socket.emit('leaveGame');
    }

    if (disconnectTimerRef.current) {
      clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    setReconnectSecondsLeft(null);
    // setWinner(null);
    // setLocalWinner(null);
    // setScore({
    //   left: 0,
    //   right: 0,
    // });

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

      return winner === side
        ? t('game.canvas.youWin')
        : t('game.canvas.youLose');
    }

    if (mode === 'ai') {
      return localWinner === 'left'
        ? t('game.canvas.youWin')
        : t('game.result.aiWins');
    }

    return localWinner === 'left'
      ? t('game.canvas.leftWins')
      : t('game.canvas.rightWins');
  })();

  const gameTitle =
    mode === 'online'
      ? t('game.title.online')
      : mode === 'ai'
        ? t('game.title.ai')
        : t('game.title.local');

  const displayedOpponentName = opponentUsername ?? t('game.canvas.opponent');

  const leftPlayerName =
    mode === 'online'
      ? side === 'left'
        ? user.username
        : displayedOpponentName
      : mode === 'ai'
        ? user.username
        : t('game.canvas.leftPlayer');

  const rightPlayerName =
    mode === 'online'
      ? side === 'right'
        ? user.username
        : displayedOpponentName
      : mode === 'ai'
        ? t('game.canvas.ai')
        : t('game.canvas.rightPlayer');

  return (
    <div className='flex min-h-[calc(100dvh-48px)] flex-col bg-[#F7F5F1]'>
      <main className='flex flex-1'>
        <section
          className='
          flex
          w-full
          flex-col
          bg-[#F7F5F1]
          px-4
          pb-6
          pt-4
          sm:px-6
          sm:pt-6
          md:px-10
          md:pt-8
          lg:px-16
        '
        >
          {/* Верхняя часть */}
          <div className='flex flex-col items-center gap-5 sm:gap-6 lg:relative lg:min-h-[70px] lg:items-start lg:justify-center justify-center'>
            <button
              type='button'
              onClick={handleBackToMenu}
              className='
                  h-[42px]
                  w-full
                  max-w-[240px]
                  rounded-full
                  border
                  border-[#D9D5D1]
                  px-4
                  text-[13px]
                  font-medium
                  uppercase
                  text-[#615050]
                  transition-colors
                  hover:bg-[#D9D9D9]/20
                  sm:h-[46px]
                  sm:w-auto
                  sm:min-w-[190px]
                  sm:px-8
                  sm:text-[14px]
                  lg:absolute
                  lg:left-0
                  lg:top-0
                '
            >
              {t('game.button.backToMenu')}
            </button>

            <div className='flex w-full flex-col items-center text-center'>
              <h1
                className='
              font-display
              text-[clamp(2rem,8vw,64px)]
              uppercase
              leading-none
              text-brand-red
            '
              >
                {gameTitle}
              </h1>

              {mode === 'online' &&
                !isGameFinished &&
                onlineStatus !== 'playing' && (
                  <p
                    className='
                  mt-3
                  text-[13px]
                  font-medium
                  uppercase
                  tracking-[0.12em]
                  text-[#615050]
                '
                  >
                    {onlineStatusText}
                  </p>
                )}

              {mode === 'online' &&
                !isGameFinished &&
                reconnectSecondsLeft !== null && (
                  <p
                    className='
                  mt-2
                  text-[13px]
                  font-medium
                  text-brand-red
                '
                  >
                    {t('game.reconnect', {
                      seconds: reconnectSecondsLeft,
                    })}
                  </p>
                )}
            </div>
          </div>

          {/* Карточка игры */}
          <div
            className='
            mx-auto
            mt-5
            w-full
            max-w-[1085px]
            rounded-[14px]
            bg-white
            px-3
            pb-3
            pt-3
            sm:px-4
            sm:pb-4
            sm:pt-4
            md:px-6
            md:pb-5
          '
          >
            {/* Игроки и счёт */}
            <div
              className='
            grid
            grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
            items-end
            gap-2
            pb-3
            sm:gap-4
            sm:pb-4
          '
            >
              <div className='min-w-0'>
                <p
                  className='
                truncate
                text-[13px]
                font-semibold
                text-black
                sm:text-[16px]
                md:text-[20px]
              '
                >
                  {leftPlayerName}
                </p>
              </div>

              <div
                className='
              flex
              shrink-0
              items-center
              gap-2
              text-[28px]
              font-semibold
              leading-none
              text-black
              sm:gap-3
              sm:text-[36px]
              md:gap-4
              md:text-[44px]
            '
              >
                <span>{score.left}</span>

                <span className='text-[20px] text-[#777171] sm:text-[24px] md:text-[30px]'>
                  :
                </span>

                <span>{score.right}</span>
              </div>

              <div className='min-w-0 text-right'>
                <p
                  className='
                truncate
                text-[13px]
                font-semibold
                text-black
                sm:text-[16px]
                md:text-[20px]
              '
                >
                  {rightPlayerName}
                </p>
              </div>
            </div>
            {/* Canvas */}
            <div
              className={`
            relative
            overflow-hidden
            rounded-[10px]
            bg-[#171717]
            sm:rounded-[14px]
            ${isGameFinished ? 'hidden min-[950px]:block' : 'block'}
          `}
            >
              {mode === 'online' ? (
                <canvas
                  ref={canvasRef}
                  width={WIDTH}
                  height={HEIGHT}
                  className='block h-auto w-full bg-[#171717]'
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

              {/* Desktop result overlay */}
              {isGameFinished && (
                <div
                  className='
                absolute
                inset-0
                hidden
                items-center
                justify-center
                bg-black/55
                px-5
                min-[950px]:flex
              '
                >
                  <div
                    className='
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
                '
                  >
                    <p
                      className='
                    text-[12px]
                    font-medium
                    uppercase
                    tracking-[0.14em]
                    text-[#615050]
                  '
                    >
                      {t('game.result.finalScore')}
                    </p>

                    <h2
                      className='
                    mt-3
                    font-display
                    text-[clamp(1.7rem,8vw,58px)]
                    uppercase
                    leading-none
                    text-brand-red
                  '
                    >
                      {resultTitle}
                    </h2>

                    <div
                      className='
                    mt-6
                    flex
                    items-center
                    gap-3
                    text-[48px]
                    font-semibold
                    leading-none
                    text-black
                  '
                    >
                      <span>{score.left}</span>
                      <span className='text-[30px] text-[#918787]'>:</span>
                      <span>{score.right}</span>
                    </div>

                    <p className='mt-4 max-w-full truncate text-[14px] text-[#615050]'>
                      {leftPlayerName} · {rightPlayerName}
                    </p>

                    {mode === 'online' ? (
                      <button
                        type='button'
                        onClick={() => setOnlineRound((round) => round + 1)}
                        className='
                      mt-4
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
                    '
                      >
                        {t('game.button.findMatch')}
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={() => {
                          setLocalWinner(null);
                          setScore({
                            left: 0,
                            right: 0,
                          });
                          setLocalRound((round) => round + 1);
                        }}
                        className='
                      mt-4
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
                    '
                      >
                        {t('game.button.rematch')}
                      </button>
                    )}

                    <button
                      type='button'
                      onClick={handleBackToMenu}
                      className='
                    mt-4
                    h-[52px]
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
                  '
                    >
                      {t('game.button.backToMenu')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile result — вместо игрового поля */}
            {isGameFinished && (
              <div
                className='
              flex
              w-full
              flex-col
              items-center
              rounded-[14px]
              bg-[#F7F5F1]
              px-5
              py-6
              text-center
              
              min-[950px]:hidden
            '
              >
                <p
                  className='
                text-[12px]
                font-medium
                uppercase
                tracking-[0.14em]
                text-[#615050]
              '
                >
                  {t('game.result.finalScore')}
                </p>

                <h2
                  className='
                mt-3
                font-display
                text-[clamp(2rem,9vw,48px)]
                uppercase
                leading-none
                text-brand-red
              '
                >
                  {resultTitle}
                </h2>

                <div
                  className='
                mt-4
                flex
                items-center
                gap-3
                text-[34px]
                font-semibold
                leading-none
                text-black
                sm:text-[40px]
              '
                >
                  <span>{score.left}</span>

                  <span className='text-[24px] text-[#918787]'>:</span>

                  <span>{score.right}</span>
                </div>

                <p className='mt-3 max-w-full truncate text-[13px] text-[#615050]'>
                  {leftPlayerName} · {rightPlayerName}
                </p>

                {mode === 'online' ? (
                  <button
                    type='button'
                    onClick={() => setOnlineRound((round) => round + 1)}
                    className='
                  mt-4
                  h-[46px]
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
                '
                  >
                    {t('game.button.findMatch')}
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => {
                      setLocalWinner(null);
                      setScore({
                        left: 0,
                        right: 0,
                      });
                      setLocalRound((round) => round + 1);
                    }}
                    className='
                  mt-4
                  h-[46px]
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
                '
                  >
                    {t('game.button.rematch')}
                  </button>
                )}

                <button
                  type='button'
                  onClick={handleBackToMenu}
                  className='
                mt-3
                h-[46px]
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
              '
                >
                  {t('game.button.backToMenu')}
                </button>
              </div>
            )}

            {/* Информация под игровым полем */}
            {mode !== 'online' && !isGameFinished && (
              <div className='mx-auto mt-5 min-h-[28px] text-center'>
                <p className='text-[12px] leading-5 text-[#615050] sm:text-[14px]'>
                  {mode === 'ai'
                    ? `${t('game.controls.difficulty')} ${DIFF_LABEL[difficulty]}`
                    : t('game.controls.local')}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
