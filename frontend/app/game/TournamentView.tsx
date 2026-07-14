'use client';

/**
 * Torneo local: registro de 2–8 alias → anuncio de la siguiente partida →
 * se juega con PongMatch (clásico) → se reporta el ganador → … → campeón.
 * La lógica del bracket vive en `tournament.ts` (pura); aquí solo la UI.
 */

import { useRef, useState } from 'react';
import { Tournament, type TournamentMatch } from './tournament';
import { DEFAULT_CONFIG } from './config';
import { PongMatch } from './PongMatch';
import type { Side } from './types';

type Phase = 'register' | 'play' | 'done';

export function TournamentView({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('register');
  const [names, setNames] = useState<string[]>(['', '']);
  const [ready, setReady] = useState(false);
  const [, forceRender] = useState(0);
  const tRef = useRef<Tournament | null>(null);

  const clean = names.map((n) => n.trim()).filter(Boolean);
  const unique = new Set(clean).size === clean.length;
  const canStart = clean.length >= 2 && unique;

  const start = () => {
    tRef.current = new Tournament(clean);
    setReady(false);
    setPhase('play');
  };

  const reset = () => {
    tRef.current = null;
    setNames(['', '']);
    setReady(false);
    setPhase('register');
  };

  // ------------------------------------------------------------- REGISTER
  if (phase === 'register') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-6">
        <h1 className="text-3xl font-bold text-white">Torneo local</h1>
        <p className="text-sm text-zinc-400">Registra entre 2 y 8 jugadores (alias únicos).</p>
        <div className="flex flex-col gap-2 w-72">
          {names.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={n}
                onChange={(e) =>
                  setNames((ns) => ns.map((v, idx) => (idx === i ? e.target.value : v)))
                }
                placeholder={`Jugador ${i + 1}`}
                maxLength={16}
                className="flex-1 h-10 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {names.length > 2 && (
                <button
                  type="button"
                  onClick={() => setNames((ns) => ns.filter((_, idx) => idx !== i))}
                  className="h-10 w-10 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {names.length < 8 && (
            <button
              type="button"
              onClick={() => setNames((ns) => [...ns, ''])}
              className="h-10 rounded-lg border border-dashed border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm"
            >
              + Añadir jugador
            </button>
          )}
        </div>
        {!unique && clean.length >= 2 && (
          <p className="text-sm text-red-400">Los alias deben ser únicos.</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!canStart}
            onClick={start}
            className="h-11 px-6 rounded-full bg-white text-black font-medium hover:bg-zinc-300 disabled:opacity-40 transition-colors"
          >
            Empezar torneo
          </button>
          <button
            type="button"
            onClick={onExit}
            className="h-11 px-6 rounded-full border border-zinc-500 text-zinc-200 font-medium hover:bg-zinc-800 transition-colors"
          >
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  const t = tRef.current!;

  // ------------------------------------------------------------- DONE
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-6">
        <h1 className="text-4xl font-bold text-white">🏆 Campeón</h1>
        <p className="text-2xl text-green-400 font-semibold">{t.champion}</p>
        <Bracket rounds={t.rounds} />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-11 px-6 rounded-full bg-white text-black font-medium hover:bg-zinc-300 transition-colors"
          >
            Nuevo torneo
          </button>
          <button
            type="button"
            onClick={onExit}
            className="h-11 px-6 rounded-full border border-zinc-500 text-zinc-200 font-medium hover:bg-zinc-800 transition-colors"
          >
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- PLAY
  const m = t.current;
  if (!m) {
    // No debería pasar (si no hay partida es que terminó), pero por seguridad:
    if (t.isComplete) setPhase('done');
    return null;
  }

  const onWinner = (side: Side) => {
    const w = side === 'left' ? m.p1 : m.p2;
    if (w) t.reportWinner(w);
    if (t.isComplete) {
      setPhase('done');
    } else {
      setReady(false);
      forceRender((v) => v + 1); // remonta PongMatch para la siguiente partida
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-4">
      <h1 className="text-2xl font-bold text-white">Torneo — Ronda {m.round + 1}</h1>
      <p className="text-lg text-zinc-200">
        <span className="text-white font-semibold">{m.p1}</span> (izq)
        <span className="text-zinc-500"> vs </span>
        <span className="text-white font-semibold">{m.p2}</span> (der)
      </p>

      {ready ? (
        <>
          <PongMatch key={m.round * 100 + m.index} config={DEFAULT_CONFIG} vsAi={false} onFinish={onWinner} />
          <p className="text-sm text-zinc-400">
            {m.p1}: W / S &nbsp;·&nbsp; {m.p2}: ↑ / ↓
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setReady(true)}
          className="h-12 px-8 rounded-full bg-white text-black font-semibold hover:bg-zinc-300 transition-colors"
        >
          ¡Jugar!
        </button>
      )}

      <Bracket rounds={t.rounds} />

      <button
        type="button"
        onClick={onExit}
        className="h-10 px-5 rounded-full border border-zinc-600 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
      >
        Abandonar torneo
      </button>
    </div>
  );
}

// Bracket compacto: una columna por ronda.
function Bracket({ rounds }: { rounds: TournamentMatch[][] }) {
  return (
    <div className="flex gap-6 overflow-x-auto max-w-full py-2">
      {rounds.map((round, r) => (
        <div key={r} className="flex flex-col justify-around gap-3 min-w-[130px]">
          <p className="text-xs uppercase tracking-wider text-zinc-500 text-center">
            {r === rounds.length - 1 ? 'Final' : `Ronda ${r + 1}`}
          </p>
          {round.map((m, i) => (
            <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-800/50 text-xs">
              <MatchRow name={m.p1} isWinner={!!m.winner && m.winner === m.p1} />
              <div className="border-t border-zinc-700" />
              <MatchRow name={m.p2} isWinner={!!m.winner && m.winner === m.p2} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MatchRow({ name, isWinner }: { name: string | null; isWinner: boolean }) {
  return (
    <div
      className={`px-2 py-1 truncate ${
        isWinner ? 'text-green-400 font-semibold' : name ? 'text-zinc-200' : 'text-zinc-600'
      }`}
    >
      {name ?? '—'}
    </div>
  );
}
