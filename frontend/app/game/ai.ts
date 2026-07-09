/**
 * IA para el modo 1 jugador. Controla la pala DERECHA como un humano: solo lee
 * estado público del motor y responde con engine.setInput('right', ...).
 *
 * Movimiento FLUIDO: cada tick avanza hacia su objetivo a velocidad completa,
 * sin sprints ni pausas (eso provocaba tirones). La dificultad NO limita su
 * velocidad, sino sus REFLEJOS: cada cuánto re-lee la bola, cuánto se equivoca
 * de puntería, su zona muerta y si anticipa el rebote.
 */

import { HEIGHT, PADDLE_HEIGHT, BALL_RADIUS, RIGHT_PADDLE_X } from './constants';
import type { PongEngine } from './pong-engine';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface AiParams {
  reactionTicks: number; // cada cuántos ticks re-lee el objetivo (mayor = más lento de reflejos)
  deadZone: number; // px de tolerancia al objetivo (mayor = falla más cerca de los bordes)
  aimNoise: number; // px ± de error de puntería
  predict: boolean; // anticipa dónde caerá la bola (rebotes incluidos)
}

const PARAMS: Record<Difficulty, AiParams> = {
  easy: { reactionTicks: 10, deadZone: 26, aimNoise: 34, predict: false },
  medium: { reactionTicks: 5, deadZone: 16, aimNoise: 18, predict: false },
  hard: { reactionTicks: 2, deadZone: 8, aimNoise: 6, predict: true },
};

// Predice la Y de la bola al llegar a la pala derecha, reflejando en las paredes.
function predictInterceptY(engine: PongEngine): number {
  if (engine.ballVX <= 0) return HEIGHT / 2;
  const ticks = (RIGHT_PADDLE_X - engine.ballX) / engine.ballVX;
  const min = BALL_RADIUS;
  const max = HEIGHT - BALL_RADIUS;
  const span = max - min;
  let y = engine.ballY + engine.ballVY * ticks - min;
  y = ((y % (2 * span)) + 2 * span) % (2 * span); // onda triangular en [0, 2*span)
  if (y > span) y = 2 * span - y; // reflexión en las paredes
  return y + min;
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
      if (engine.ballVX > 0) {
        const aimY = this.p.predict ? predictInterceptY(engine) : engine.ballY;
        this.targetY = aimY + (Math.random() * 2 - 1) * this.p.aimNoise;
      } else {
        this.targetY = HEIGHT / 2; // la bola se aleja → vuelve al centro
      }
    }
    this.ticksToReplan--;

    // Cada tick se mueve hacia el objetivo a velocidad completa → sin tirones.
    // deadZone >= PADDLE_SPEED evita el zigzag al llegar (no sobrepasa el objetivo).
    const center = engine.rightPaddleY + PADDLE_HEIGHT / 2;
    const delta = this.targetY - center;
    engine.setInput(
      'right',
      Math.abs(delta) <= this.p.deadZone ? 'stop' : delta > 0 ? 'down' : 'up',
    );
  }
}
