'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { connectGameSocket } from '@/app/lib/socket';
import { PongRenderer } from './renderer';
import { PongMatch } from './PongMatch';
import { TournamentView } from './TournamentView';
import { type Difficulty } from './ai';
import { WIDTH, HEIGHT } from './constants';
import { MAP_LABEL, type MapId } from './config';
import type { GameSnapshot, Mode, Side } from './types';
import { useSocket } from '@/context/SocketContext';
import { decode } from '@msgpack/msgpack';

type OnlineStatus =
  | 'connecting'
  | 'waiting'
  | 'playing'
  | 'gameover'
  | 'opponent-left';

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Normal',
  hard: 'Difícil',
};

export default function GamePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement>(null); // solo modo online
  const rendererRef = useRef(new PongRenderer());

  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mode, setMode] = useState<Mode>('menu');

  // Modo ONLINE
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('connecting');
  const [side, setSide] = useState<Side | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [onlineRound, setOnlineRound] = useState(0);

  // Modo LOCAL / IA
  const [localWinner, setLocalWinner] = useState<Side | null>(null);
  const [localRound, setLocalRound] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Personalización de la partida local/IA
  const [mapId, setMapId] = useState<MapId>('classic');
  const [powerups, setPowerups] = useState(false);
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
    return () => {
      socket.off('gameInviteAccepted', onInviteAccepted);
    };
  }, [socket]);

  // Auto-resume: if this session already has an active online match (e.g.
  // after a mid-game refresh), jump straight into it instead of making the
  // user click "Jugar Online" again and lose time sitting on the menu.
  useEffect(() => {
    if (!socket || mode !== 'menu') return;

    const onAutoRejoin = () => {
      setOnlineRound((r) => r + 1);
      setMode('online');
    };

    socket.on('rejoinedGame', onAutoRejoin);
    socket.emit('checkRoom');

    return () => {
      socket.off('rejoinedGame', onAutoRejoin);
    };
  }, [socket, mode]);

  // ----------------------------------------------------------------- ONLINE
  useEffect(() => {
    if (mode !== 'online' || !socket) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); // initiate rendering
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
      // Limpieza del intervalo al terminar el juego
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
      setOnlineStatus('opponent-left'); // or your dedicated 'match-voided' status
      setWinner(null);
    };

    const onOpponentReconnected = () => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setReconnectSecondsLeft(null);
    };
    
    /*socket.on('disconnect', () => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      setReconnectSecondsLeft(null);
    });*/

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
      if (snapshot) renderer.draw(ctx, snapshot, mySide ?? undefined);
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
      // Remove ONLY this effect's listeners — do NOT disconnect the socket,
      // it's shared app-wide and owned by SocketProvider.
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
        return winner === side ? '¡Has ganado! 🎉' : 'Has perdido 😢';
      case 'opponent-left':
        return 'El rival abandonó — ganas por abandono';
    }
  })();

  const startLocal = (m: Mode) => {
    setLocalWinner(null);
    setLocalRound((r) => r + 1);
    setMode(m);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <p className="text-zinc-300 text-sm">Cargando…</p>
      </div>
    );
  }

  // ------------------------------------------------------------------ MENÚ
  if (mode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-8 py-10">
        <h1 className="text-4xl font-bold text-white">Pong</h1>
        <div className="flex flex-col gap-4 w-72">
          <button
            type="button"
            onClick={() => {
              setOnlineRound((r) => r + 1);
              setMode('online');
            }}
            className="h-12 rounded-full bg-white text-black font-semibold hover:bg-zinc-300 transition-colors"
          >
            Jugar Online
          </button>

          <button
            type="button"
            onClick={() => startLocal('local')}
            className="h-12 rounded-full border border-zinc-500 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            Jugar Local (2 jugadores)
          </button>
          
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setLocalRound((r) => r + 1);
                setMode('ai');
              }}
              className="h-12 rounded-full border border-zinc-500 text-white font-semibold hover:bg-zinc-800 transition-colors"
            >
              Jugar vs IA (1 jugador)
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
          <button
            type="button"
            onClick={() => setMode('tournament')}
            className="h-12 rounded-full border border-zinc-500 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            Torneo local
          </button>
        </div>

        {/* Personalización (solo local / IA) */}
        <div className="flex flex-col gap-3 w-72 border-t border-zinc-800 pt-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Personalización (local / IA)
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400 w-16">Mapa</span>
            {(['classic', 'obstacles'] as MapId[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMapId(m)}
                className={`flex-1 h-9 rounded-full text-sm font-medium transition-colors ${
                  mapId === m
                    ? 'bg-white text-black'
                    : 'border border-zinc-500 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {MAP_LABEL[m]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPowerups((p) => !p)}
            className={`h-9 rounded-full text-sm font-medium transition-colors ${
              powerups
                ? 'bg-white text-black'
                : 'border border-zinc-500 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            Power-ups: {powerups ? 'ON' : 'OFF'}
          </button>
        </div>

        <p className="text-sm text-zinc-500 text-center max-w-xs">
          Online: te emparejamos con otro jugador. Local/IA/Torneo: en este mismo
          equipo.
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------- TORNEO
  if (mode === 'tournament') {
    return <TournamentView onExit={() => setMode('menu')} />;
  }

  const backToMenu = () => setMode('menu');
  const handleBackToMenu = () => {
    if (mode === 'online' && socket) {
      socket.emit('leaveGame');
    }
    // Clear immediately so no stale countdown flashes when re-entering.
    if (disconnectTimerRef.current) {
      clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    setReconnectSecondsLeft(null);
    backToMenu();
  };

  // ------------------------------------------------------ ONLINE / LOCAL / IA
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-4">
      <h1 className="text-3xl font-bold text-white">
        {mode === 'online' ? 'Pong Online' : mode === 'ai' ? 'Pong vs IA' : 'Pong Local'}
      </h1>

      <p className="text-lg text-zinc-200 h-7">
        {mode === 'online'
          ? onlineStatusText
          : localWinner
            ? mode === 'ai'
              ? localWinner === 'left'
                ? '¡Has ganado! 🎉'
                : '¡Gana la IA! 🤖'
              : localWinner === 'left'
                ? '¡Gana el jugador IZQUIERDA! 🎉'
                : '¡Gana el jugador DERECHA! 🎉'
            : mode === 'ai'
              ? `Tú (izquierda) vs IA · ${DIFF_LABEL[difficulty]} — primero a 5 gana`
              : 'Primer jugador en llegar a 5 gana'}
      </p>

      {mode === 'online' && reconnectSecondsLeft !== null && (
        <p className="text-sm font-semibold text-amber-400 animate-pulse h-5">
          Rival desconectado — ganas en {reconnectSecondsLeft}s si no vuelve
        </p>
      )}

      {/* Online: el canvas lo pinta el effect con los snapshots del servidor.
          Local / IA: PongMatch trae su propio motor, bucle y teclado. */}
      {mode === 'online' ? (
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="border-4 border-white shadow-lg max-w-full"
        />
      ) : (
        <PongMatch
          key={localRound}
          config={{ map: mapId, powerups }}
          vsAi={mode === 'ai'}
          difficulty={difficulty}
          onFinish={(w) => setLocalWinner(w)}
        />
      )}

      <p className="text-sm text-zinc-400">
        {mode === 'online'
          ? 'Tus controles: ↑ / ↓ (o W / S)'
          : mode === 'ai'
            ? 'Tus controles: W / S  (o ↑ / ↓)'
            : 'Izquierda: W / S     ·     Derecha: ↑ / ↓'}
      </p>

      <div className="flex gap-3">
        {mode === 'online' &&
          (onlineStatus === 'gameover' || onlineStatus === 'opponent-left') && (
            <button
              type="button"
              onClick={() => setOnlineRound((r) => r + 1)}
              className="h-11 px-6 rounded-full bg-white text-black font-medium hover:bg-zinc-300 transition-colors"
            >
              Buscar otra partida
            </button>
          )}
        {mode !== 'online' && localWinner && (
          <button
            type="button"
            onClick={() => {
              setLocalWinner(null);
              setLocalRound((r) => r + 1);
            }}
            className="h-11 px-6 rounded-full bg-white text-black font-medium hover:bg-zinc-300 transition-colors"
          >
            Revancha
          </button>
        )}
        <button
          type="button"
          onClick={handleBackToMenu}
          className="h-11 px-6 rounded-full border border-zinc-500 text-zinc-200 font-medium hover:bg-zinc-800 transition-colors"
        >
          Volver al menú
        </button>
      </div>
    </div>
  );
}
