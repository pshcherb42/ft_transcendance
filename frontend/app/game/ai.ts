/**
 * IA para el modo 1 jugador. Controla la pala DERECHA como un humano: solo lee
 * estado público del motor y responde con engine.setInput('right', ...).
 *
 * Movimiento FLUIDO: cada tick avanza hacia su objetivo a velocidad completa.
 * La dificultad no limita su velocidad, sino sus REFLEJOS (cada cuánto re-lee la
 * bola, su error de puntería, su zona muerta y si anticipa el rebote). Con
 * multibola, apunta a la bola entrante que llegará antes.
 */

import { HEIGHT, BALL_RADIUS, RIGHT_PADDLE_X } from './constants';
import type { PongEngine } from './pong-engine';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface AiParams {
  reactionTicks: number; // cada cuántos ticks re-lee el objetivo
  deadZone: number; // px de tolerancia (debe ser >= PADDLE_SPEED para no hacer zigzag)
  aimNoise: number; // px ± de error de puntería
  predict: boolean; // anticipa dónde caerá la bola (rebotes incluidos)
}

const PARAMS: Record<Difficulty, AiParams> = {
  easy: { reactionTicks: 10, deadZone: 26, aimNoise: 34, predict: false },
  medium: { reactionTicks: 5, deadZone: 16, aimNoise: 18, predict: false },
  hard: { reactionTicks: 2, deadZone: 14, aimNoise: 6, predict: true },
};

// Predice la Y de una bola al llegar a la pala derecha, reflejando en las paredes.
function predictInterceptY(x: number, y: number, vx: number, vy: number): number {
  if (vx <= 0) return HEIGHT / 2;
  const ticks = (RIGHT_PADDLE_X - x) / vx;
  const min = BALL_RADIUS;
  const max = HEIGHT - BALL_RADIUS;
  const span = max - min;
  let ry = y + vy * ticks - min;
  ry = ((ry % (2 * span)) + 2 * span) % (2 * span); // onda triangular
  if (ry > span) ry = 2 * span - ry; // reflexión en las paredes
  return ry + min;
}

export class PongAi {
  private readonly p: AiParams;
  private ticksToReplan = 0;
  private targetY = HEIGHT / 2;

  constructor(difficulty: Difficulty = 'medium') {
    this.p = PARAMS[difficulty];
  }

  /** Llamar una vez por tick, ANTES de engine.step(). Controla la pala DERECHA. */
  update(engine: PongEngine) {
    if (this.ticksToReplan <= 0) {
      this.ticksToReplan = this.p.reactionTicks;

      // Bola entrante (vx>0) que llegará antes a la pala derecha.
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
        this.targetY = HEIGHT / 2; // ninguna bola viene → vuelve al centro
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
