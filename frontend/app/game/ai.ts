/**
 * AI for 1-player mode. Controls the RIGHT paddle like a human: it only reads
 * the engine's public state and responds with engine.setInput('right', ...).
 *
 * SMOOTH movement: every tick it moves toward its target at full speed.
 * Difficulty doesn't limit its speed, but its REFLEXES (how often it re-reads
 * the ball, its aim error, its dead zone, and whether it anticipates the
 * bounce). With multiball, it aims at the incoming ball that will arrive first.
 */

import { HEIGHT, BALL_RADIUS, RIGHT_PADDLE_X } from './constants';
import type { PongEngine } from './pong-engine';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface AiParams {
  reactionTicks: number; // how many ticks between re-reading the target
  deadZone: number; // px of tolerance (must be >= PADDLE_SPEED to avoid zigzag)
  aimNoise: number; // px ± of aim error
  predict: boolean; // anticipates where the ball will land (bounces included)
}

const PARAMS: Record<Difficulty, AiParams> = {
  easy: { reactionTicks: 10, deadZone: 26, aimNoise: 34, predict: false },
  medium: { reactionTicks: 5, deadZone: 16, aimNoise: 18, predict: false },
  hard: { reactionTicks: 2, deadZone: 14, aimNoise: 6, predict: true },
};

// Predicts a ball's Y when it reaches the right paddle, reflecting off the walls.
function predictInterceptY(x: number, y: number, vx: number, vy: number): number {
  if (vx <= 0) return HEIGHT / 2;
  const ticks = (RIGHT_PADDLE_X - x) / vx;
  const min = BALL_RADIUS;
  const max = HEIGHT - BALL_RADIUS;
  const span = max - min;
  let ry = y + vy * ticks - min;
  ry = ((ry % (2 * span)) + 2 * span) % (2 * span); // triangular wave
  if (ry > span) ry = 2 * span - ry; // reflection off the walls
  return ry + min;
}

export class PongAi {
  private readonly p: AiParams;
  private ticksToReplan = 0;
  private targetY = HEIGHT / 2;

  constructor(difficulty: Difficulty = 'medium') {
    this.p = PARAMS[difficulty];
  }

  /** Call once per tick, BEFORE engine.step(). Controls the RIGHT paddle. */
  update(engine: PongEngine) {
    if (this.ticksToReplan <= 0) {
      this.ticksToReplan = this.p.reactionTicks;

      // Incoming ball (vx>0) that will reach the right paddle first.
      let target: { x: number; y: number; vx: number; vy: number } | null = null;
      let bestTicks = Infinity;
      for (const b of engine.balls) {
        if (b.vx > 0) {
          const t = (RIGHT_PADDLE_X - b.x) / b.vx;
          if (t >= 0 && t < bestTicks) {
            bestTicks = t;
            target = b;
          }
        }
      }

      if (target) {
        const aimY = this.p.predict
          ? predictInterceptY(target.x, target.y, target.vx, target.vy)
          : target.y;
        this.targetY = aimY + (Math.random() * 2 - 1) * this.p.aimNoise;
      } else {
        this.targetY = HEIGHT / 2; // no ball incoming → return to the center
      }
    }
    this.ticksToReplan--;

    const center = engine.rightPaddleY + engine.rightPaddleH / 2;
    const delta = this.targetY - center;
    engine.setInput(
      'right',
      Math.abs(delta) <= this.p.deadZone ? 'stop' : delta > 0 ? 'down' : 'up',
    );
  }
}
