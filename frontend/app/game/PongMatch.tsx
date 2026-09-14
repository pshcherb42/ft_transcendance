'use client';

/**
 * Component for ONE local match (2 players or vs AI), reused by local mode,
 * AI mode and the tournament. It wraps the engine, the fixed-step loop, the
 * keyboard and the rendering. It reports the winner via `onFinish`.
 *
 * For "rematch"/"next match" the parent remounts it by changing its `key`.
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
  onScoreChange?: (score: { left: number; right: number }) => void;
}

export function PongMatch({
  config,
  vsAi,
  difficulty = 'medium',
  onFinish,
  onScoreChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onScoreChangeRef = useRef(onScoreChange);
  onScoreChangeRef.current = onScoreChange;
  const touchControlsRef = useRef<{
    setDir: (side: 'left' | 'right', d: 'up' | 'down' | 'stop') => void;
  } | null>(null);
  const touchStateRef = useRef<
    Map<number, { side: 'left' | 'right'; startY: number }>
  >(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new PongRenderer();
    const engine = new PongEngine(config);
    const ai = vsAi ? new PongAi(difficulty) : null;
    touchControlsRef.current = {
      setDir: (side, d) => engine.setInput(side, d),
    };
    let finished = false;
    let previousScoreLeft = 0;
    let previousScoreRight = 0;
    onScoreChangeRef.current?.({
      left: 0,
      right: 0,
    });

    // Keyboard: vs AI → the human plays the LEFT paddle (W/S or arrows).
    //           2 players → left W/S, right ↑/↓.
    const pressed = new Set<string>();
    const refresh = () => {
      if (vsAi) {
        const up = pressed.has('w') || pressed.has('ArrowUp');
        const down = pressed.has('s') || pressed.has('ArrowDown');
        engine.setInput(
          'left',
          up && !down ? 'up' : down && !up ? 'down' : 'stop',
        );
      } else {
        const lUp = pressed.has('w');
        const lDown = pressed.has('s');
        engine.setInput(
          'left',
          lUp && !lDown ? 'up' : lDown && !lUp ? 'down' : 'stop',
        );
        const rUp = pressed.has('ArrowUp');
        const rDown = pressed.has('ArrowDown');
        engine.setInput(
          'right',
          rUp && !rDown ? 'up' : rDown && !rUp ? 'down' : 'stop',
        );
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

    // Fixed-step physics (TICK_RATE Hz).
    const stepTimer = setInterval(() => {
      if (ai) {
        ai.update(engine);
      }

      engine.step();

      const snapshot = engine.getSnapshot();

      if (
        snapshot.scoreLeft !== previousScoreLeft ||
        snapshot.scoreRight !== previousScoreRight
      ) {
        previousScoreLeft = snapshot.scoreLeft;
        previousScoreRight = snapshot.scoreRight;

        onScoreChangeRef.current?.({
          left: snapshot.scoreLeft,
          right: snapshot.scoreRight,
        });
      }

      if (!finished && engine.status === 'finished' && engine.winner) {
        finished = true;
        onFinishRef.current?.(engine.winner);
      }
    }, 1000 / TICK_RATE);

    // Render at the browser's refresh rate.
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
      touchControlsRef.current = null;
      touchStateRef.current.clear();
    };
    // Primitive deps: the parent remounts with `key` to restart the match.
  }, [config.map, config.powerups, vsAi, difficulty]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className='block h-auto w-full max-w-full bg-canvas touch-none'
      onTouchStart={(e) => {
        e.preventDefault();
        const rect = canvasRef.current!.getBoundingClientRect();
        for (const t of Array.from(e.changedTouches)) {
          const side: 'left' | 'right' =
            !vsAi && t.clientX - rect.left > rect.width / 2 ? 'right' : 'left';
          touchStateRef.current.set(t.identifier, { side, startY: t.clientY });
        }
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          const state = touchStateRef.current.get(t.identifier);
          if (!state) continue;
          const delta = t.clientY - state.startY;
          const DEADZONE = 12;
          const dir =
            delta < -DEADZONE ? 'up' : delta > DEADZONE ? 'down' : 'stop';
          touchControlsRef.current?.setDir(state.side, dir);
        }
      }}
      onTouchEnd={(e) => {
        for (const t of Array.from(e.changedTouches)) {
          const state = touchStateRef.current.get(t.identifier);
          if (state) touchControlsRef.current?.setDir(state.side, 'stop');
          touchStateRef.current.delete(t.identifier);
        }
      }}
      onTouchCancel={(e) => {
        for (const t of Array.from(e.changedTouches)) {
          const state = touchStateRef.current.get(t.identifier);
          if (state) touchControlsRef.current?.setDir(state.side, 'stop');
          touchStateRef.current.delete(t.identifier);
        }
      }}
    />
  );
}
