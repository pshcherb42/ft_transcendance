'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { PongEngine } from './pong-engine';
import { PongAi, type Difficulty } from './ai';
import { PongRenderer } from './renderer';
import { WIDTH, HEIGHT, TICK_RATE } from './constants';
import type { GameSnapshot, Mode, Side } from './types';
import { useSocket } from '@/context/SocketContext';
import { decode } from '@msgpack/msgpack';

type OnlineStatus = 'connecting' | 'waiting' | 'playing' | 'gameover' | 'opponent-left';

export default function GamePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(new PongRenderer());

  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mode, setMode] = useState<Mode>('menu');

  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('connecting');
  const [side, setSide] = useState<Side | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [onlineRound, setOnlineRound] = useState(0);

  const [localWinner, setLocalWinner] = useState<Side | null>(null);
  const [localRound, setLocalRound] = useState(0);

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const socket = useSocket();

  // La página requiere sesión.
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Fires only if the user is already sitting on /game (menu or mid-queue)
  // when an invite gets accepted — router.push('/game') is a no-op in that
  // case since the route doesn't change, so nothing else would pick this up.
  useEffect(() => {
    if (!socket) return;
    const onInviteAccepted = () => {
      setOnlineRound((r) => r + 1);
      setMode('online');
    };
    socket.on('gameInviteAccepted', onInviteAccepted);
    return () => { socket.off('gameInviteAccepted', onInviteAccepted); };
  }, [socket]);

  useEffect(() => {
    if (!socket || mode !== 'menu') return;
    const onAutoRejoin = () => {
      setOnlineRound((r) => r + 1);
      setMode('online');
    };
    socket.on('rejoinedGame', onAutoRejoin);
    socket.emit('checkRoom');
    return () => { socket.off('rejoinedGame', onAutoRejoin); };
  }, [socket, mode]);

  // ----------------------------------------------------------------- ONLINE
  useEffect(() => {
    if (mode !== 'online' || !socket) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = rendererRef.current; // reinitiate game state 
    setOnlineStatus('connecting');
    setSide(null);
    setWinner(null);

    let snapshot: GameSnapshot | null = null;
    let mySide: Side | null = null;

    // Socket is already connected (app-wide) — just join the queue directly,
    // and re-join if we ever reconnect mid-session.
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
      // Limpieza del intervalo al desmontar o cambiar de ronda
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
  }, [mode, onlineRound, socket]);

  // ------------------------------------------------------------------ LOCAL
  useEffect(() => {
    if (mode !== 'local' && mode !== 'ai') return;
    const isAi = mode === 'ai';

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
    const engine = new PongEngine();
    const ai = isAi ? new PongAi(difficulty) : null;
    setLocalWinner(null);

    const pressed = new Set<string>();
    const refresh = () => {
      if (isAi) {
        const up = pressed.has('w') || pressed.has('ArrowUp');
        const down = pressed.has('s') || pressed.has('ArrowDown');
        engine.setInput('left', up && !down ? 'up' : down && !up ? 'down' : 'stop');
      } else {
        const lUp = pressed.has('w');
        const lDown = pressed.has('s');
        engine.setInput('left', lUp && !lDown ? 'up' : lDown && !lUp ? 'down' : 'stop');
        const rUp = pressed.has('ArrowUp');
        const rDown = pressed.has('ArrowDown');
        engine.setInput('right', rUp && !rDown ? 'up' : rDown && !rUp ? 'down' : 'stop');
      }
    };
    const norm = (k: string): string | null => {
      if (k === 'w' || k === 'W') return 'w';
      if (k === 's' || k === 'S') return 's';
      if (k === 'ArrowUp' || k === 'ArrowDown') return k;
      return null;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = norm(e.key);
      if (!k) return;
      if (k.startsWith('Arrow')) e.preventDefault();
      pressed.add(k);
      refresh();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = norm(e.key);
      if (!k) return;
      pressed.delete(k);
      refresh();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const stepTimer = setInterval(() => {
      if (ai) ai.update(engine);
      engine.step();
      if (engine.status === 'finished' && engine.winner) {
        setLocalWinner(engine.winner);
      }
    }, 1000 / TICK_RATE);

    let raf: number;
    const loop = () => {
      renderer.draw(ctx, engine.getSnapshot(), isAi ? 'left' : undefined, canvasLabels);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      clearInterval(stepTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode, localRound, difficulty, t]);

  // --------------------------------------------------------------- UI helpers
  const onlineStatusText = (() => {
    switch (onlineStatus) {
      case 'connecting':
        return 'Conectando…';
      case 'waiting':
        return 'Buscando rival…';
      case 'playing':                                                                                                                                                         
        return side === 'left'
          ? 'Eres el jugador IZQUIERDA'
          : 'Eres el jugador DERECHA';
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

  if (mode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-8">
        <h1 className="text-4xl font-bold text-white">{t('game.menu.title')}</h1>
        <div className="flex flex-col gap-4 w-64">
          <button
            type="button"
            onClick={() => { setOnlineRound((r) => r + 1); setMode('online'); }}
            className="h-12 rounded-full bg-white text-black font-semibold hover:bg-zinc-300 transition-colors"
          >
            {t('game.menu.playOnline')}
          </button>

          <button
            type="button"
            onClick={() => { setLocalRound((r) => r + 1); setMode('local'); }}
            className="h-12 rounded-full border border-zinc-500 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            {t('game.menu.playLocal')}
          </button>
          
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { setLocalRound((r) => r + 1); setMode('ai'); }}
              className="h-12 rounded-full border border-zinc-500 text-white font-semibold hover:bg-zinc-800 transition-colors"
            >
              {t('game.menu.playAi')}
            </button>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 h-9 rounded-full text-sm font-medium transition-colors ${
                    difficulty === d
                      ? 'bg-white text-black'
                      : 'border border-zinc-500 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {DIFF_LABEL[d]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-500 text-center max-w-xs">
          {t('game.menu.description')}
        </p>
      </div>
    );
  }

  const backToMenu = () => setMode('menu');
  const handleBackToMenu = () => {
    if (mode === 'online' && socket) {
      socket.emit('leaveGame');
    }
    if (disconnectTimerRef.current) {
      clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    setReconnectSecondsLeft(null);
    backToMenu();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-4">
      <h1 className="text-3xl font-bold text-white">
        {mode === 'online' ? t('game.title.online') : mode === 'ai' ? t('game.title.ai') : t('game.title.local')}
      </h1>

      <p className="text-lg text-zinc-200 h-7">
        {mode === 'online'
          ? onlineStatusText
          : localWinner
            ? mode === 'ai'
              ? (localWinner === 'left' ? t('game.result.youWin') : t('game.result.aiWins'))
              : (localWinner === 'left' ? t('game.result.leftWins') : t('game.result.rightWins'))
            : mode === 'ai'
              ? t('game.subtitle.ai', { difficulty: DIFF_LABEL[difficulty] })
              : t('game.subtitle.local')}
      </p>

      {mode === 'online' && reconnectSecondsLeft !== null && (
        <p className="text-sm font-semibold text-amber-400 animate-pulse h-5">
          {t('game.reconnect', { seconds: reconnectSecondsLeft })}
        </p>
      )}

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="border-4 border-white shadow-lg max-w-full"
      />

      <p className="text-sm text-zinc-400">
        {mode === 'online'
          ? t('game.controls.online')
          : mode === 'ai'
            ? t('game.controls.ai')
            : t('game.controls.local')}
      </p>

      <div className="flex gap-3">
        {mode === 'online' &&
          (onlineStatus === 'gameover' || onlineStatus === 'opponent-left') && (
            <button
              type="button"
              onClick={() => setOnlineRound((r) => r + 1)}
              className="h-11 px-6 rounded-full bg-white text-black font-medium hover:bg-zinc-300 transition-colors"
            >
              {t('game.button.findMatch')}
            </button>
          )}
        {(mode === 'local' || mode === 'ai') && localWinner && (
          <button
            type="button"
            onClick={() => setLocalRound((r) => r + 1)}
            className="h-11 px-6 rounded-full bg-white text-black font-medium hover:bg-zinc-300 transition-colors"
          >
            {t('game.button.rematch')}
          </button>
        )}
        <button
          type="button"
          onClick={handleBackToMenu}
          className="h-11 px-6 rounded-full border border-zinc-500 text-zinc-200 font-medium hover:bg-zinc-800 transition-colors"
        >
          {t('game.button.backToMenu')}
        </button>
      </div>
    </div>
  );
}