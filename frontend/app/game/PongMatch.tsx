'use client';

/**
 * Componente de UNA partida local (2 jugadores o vs IA), reutilizable por el
 * modo local, el modo IA y el torneo. Encapsula el motor, el bucle a paso fijo,
 * el teclado y el render. Avisa del ganador por `onFinish`.
 *
 * Para "revancha"/"siguiente partida" el padre lo remonta cambiando su `key`.
 */

import { useEffect, useRef } from 'react';
import { PongEngine } from './pong-engine';
import { PongAi, type Difficulty } from './ai';
import { PongRenderer } from './renderer';
import { WIDTH, HEIGHT, TICK_RATE } from './constants';
import type { GameConfig } from './config';
import type { Side } from './types';

interface Props {
  config: GameConfig;
  vsAi: boolean;
  difficulty?: Difficulty;
  onFinish?: (winner: Side) => void;
}

export function PongMatch({ config, vsAi, difficulty = 'medium', onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new PongRenderer();
    const engine = new PongEngine(config);
    const ai = vsAi ? new PongAi(difficulty) : null;
    let finished = false;

    // Teclado: vs IA → el humano lleva la IZQUIERDA (W/S o flechas).
    //          2 jugadores → izquierda W/S, derecha ↑/↓.
    const pressed = new Set<string>();
    const refresh = () => {
      if (vsAi) {
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

    // Física a paso fijo (TICK_RATE Hz).
    const stepTimer = setInterval(() => {
      if (ai) ai.update(engine);
      engine.step();
      if (!finished && engine.status === 'finished' && engine.winner) {
        finished = true;
        onFinishRef.current?.(engine.winner);
      }
    }, 1000 / TICK_RATE);

    // Render a la tasa del navegador.
    let raf: number;
    const loop = () => {
      renderer.draw(ctx, engine.getSnapshot(), vsAi ? 'left' : undefined);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      clearInterval(stepTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // Deps primitivas: el padre remonta con `key` para reiniciar la partida.
  }, [config.map, config.powerups, vsAi, difficulty]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="border-4 border-white shadow-lg max-w-full"
    />
  );
}
