/**
 * Motor de Pong del frontend (modo LOCAL, 2 jugadores en el mismo teclado).
 *
 * Es un espejo del motor autoritativo del backend
 * (backend/src/websockets/pong-engine.ts): misma física y constantes, para que
 * jugar en local se sienta idéntico a jugar online. En modo online NO se usa
 * este motor: el servidor calcula la física y el cliente solo pinta el snapshot.
 */

import {
  WIDTH,
  HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  LEFT_PADDLE_X,
  RIGHT_PADDLE_X,
  BALL_RADIUS,
  BALL_SPEED_START,
  BALL_SPEED_MAX,
  BALL_SPEEDUP,
  MAX_BOUNCE_RAD,
  SERVE_JITTER_RAD,
  BALL_SPIN,
  WINNING_SCORE,
  TICK_RATE,
  COUNTDOWN_TICKS,
} from './constants';
import type { Side, Dir, Status, GameSnapshot } from './types';

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export class PongEngine {
  leftPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;
  rightPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;

  ballX = WIDTH / 2;
  ballY = HEIGHT / 2;
  ballVX = 0;
  ballVY = 0;
  ballSpeed = BALL_SPEED_START;

  leftPaddleVY = 0;   // desplazamiento vertical REAL de la pala en el último tick (post-clamp)
  rightPaddleVY = 0;

  scoreLeft = 0;
  scoreRight = 0;

  status: Status = 'countdown';
  winner: Side | null = null;

  private countdownTicks = COUNTDOWN_TICKS;
  private serveDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

  private leftInput = { up: false, down: false };
  private rightInput = { up: false, down: false };

  setInput(side: Side, dir: Dir) {
    const input = side === 'left' ? this.leftInput : this.rightInput;
    input.up = dir === 'up';
    input.down = dir === 'down';
  }

  step() {
    if (this.status === 'finished') return;

    this.movePaddles();

    if (this.status === 'countdown') {
      if (--this.countdownTicks <= 0) this.serve();
      return;
    }

    this.moveBall();
  }

  getSnapshot(): GameSnapshot {
    return {
      status: this.status,
      countdown:
        this.status === 'countdown'
          ? Math.ceil(this.countdownTicks / TICK_RATE)
          : 0,
      leftPaddleY: this.leftPaddleY,
      rightPaddleY: this.rightPaddleY,
      ballX: this.ballX,
      ballY: this.ballY,
      scoreLeft: this.scoreLeft,
      scoreRight: this.scoreRight,
      winner: this.winner,
    };
  }

  // ------------------------------------------------------------------ privados

  private movePaddles() {
    const prevLeft = this.leftPaddleY;
    const prevRight = this.rightPaddleY;

    if (this.leftInput.up) this.leftPaddleY -= PADDLE_SPEED;
    if (this.leftInput.down) this.leftPaddleY += PADDLE_SPEED;
    if (this.rightInput.up) this.rightPaddleY -= PADDLE_SPEED;
    if (this.rightInput.down) this.rightPaddleY += PADDLE_SPEED;

    this.leftPaddleY = clamp(this.leftPaddleY, 0, HEIGHT - PADDLE_HEIGHT);
    this.rightPaddleY = clamp(this.rightPaddleY, 0, HEIGHT - PADDLE_HEIGHT);

    // Velocidad vertical real de cada pala este tick (después del clamp): si la
    // pala está pegada a un borde su velocidad es 0 y no imprime efecto.
    this.leftPaddleVY = this.leftPaddleY - prevLeft;
    this.rightPaddleVY = this.rightPaddleY - prevRight;
  }

  private startCountdown(serveDir: 1 | -1) {
    this.status = 'countdown';
    this.countdownTicks = COUNTDOWN_TICKS;
    this.serveDir = serveDir;
    this.ballX = WIDTH / 2;
    this.ballY = HEIGHT / 2;
    this.ballVX = 0;
    this.ballVY = 0;
    this.ballSpeed = BALL_SPEED_START;
  }

  private serve() {
    this.status = 'playing';

    // Centro vertical de la pala que va a recibir el saque.
    const targetY =
      this.serveDir === 1
        ? this.rightPaddleY + PADDLE_HEIGHT / 2
        : this.leftPaddleY + PADDLE_HEIGHT / 2;

    // Distancia horizontal (>0) del centro a la cara de la pala receptora.
    const dx =
      this.serveDir === 1
        ? RIGHT_PADDLE_X - this.ballX
        : this.ballX - (LEFT_PADDLE_X + PADDLE_WIDTH);

    // Ángulo que apunta al centro de la pala receptora + pequeña variación,
    // limitado a un cono seguro y alcanzable (±MAX_BOUNCE_RAD).
    const aim = Math.atan2(targetY - this.ballY, dx);
    const jitter = (Math.random() * 2 - 1) * SERVE_JITTER_RAD;
    const angle = clamp(aim + jitter, -MAX_BOUNCE_RAD, MAX_BOUNCE_RAD);

    this.ballVX = this.serveDir * this.ballSpeed * Math.cos(angle);
    this.ballVY = this.ballSpeed * Math.sin(angle);
  }

  private moveBall() {
    this.ballX += this.ballVX;
    this.ballY += this.ballVY;

    if (this.ballY - BALL_RADIUS <= 0) {
      this.ballY = BALL_RADIUS;
      this.ballVY = Math.abs(this.ballVY);
    } else if (this.ballY + BALL_RADIUS >= HEIGHT) {
      this.ballY = HEIGHT - BALL_RADIUS;
      this.ballVY = -Math.abs(this.ballVY);
    }

    this.bounceOnPaddle('left');
    this.bounceOnPaddle('right');

    if (this.ballX - BALL_RADIUS <= 0) {
      this.scoreRight++;
      this.afterGoal('right');
    } else if (this.ballX + BALL_RADIUS >= WIDTH) {
      this.scoreLeft++;
      this.afterGoal('left');
    }
  }

  private bounceOnPaddle(side: Side) {
    const paddleX = side === 'left' ? LEFT_PADDLE_X : RIGHT_PADDLE_X;
    const paddleY = side === 'left' ? this.leftPaddleY : this.rightPaddleY;
    const movingToward = side === 'left' ? this.ballVX < 0 : this.ballVX > 0;
    if (!movingToward) return;

    const overlapX =
      this.ballX - BALL_RADIUS < paddleX + PADDLE_WIDTH &&
      this.ballX + BALL_RADIUS > paddleX;
    const overlapY =
      this.ballY + BALL_RADIUS > paddleY &&
      this.ballY - BALL_RADIUS < paddleY + PADDLE_HEIGHT;
    if (!overlapX || !overlapY) return;

    const relative = clamp(
      (this.ballY - (paddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2),
      -1,
      1,
    );
    const angle = relative * MAX_BOUNCE_RAD;
    this.ballSpeed = Math.min(this.ballSpeed + BALL_SPEEDUP, BALL_SPEED_MAX);

    const dirX = side === 'left' ? 1 : -1;
    this.ballVX = dirX * this.ballSpeed * Math.cos(angle);
    this.ballVY = this.ballSpeed * Math.sin(angle);

    // Spin: la velocidad vertical real de la pala arrastra a la bola.
    const paddleVY = side === 'left' ? this.leftPaddleVY : this.rightPaddleVY;
    this.ballVY += BALL_SPIN * paddleVY;

    // Renormalizamos: el spin curva la trayectoria pero NO cambia el módulo de la
    // velocidad, así que |v| sigue siendo exactamente ballSpeed (<= BALL_SPEED_MAX).
    const mag = Math.hypot(this.ballVX, this.ballVY);
    if (mag > 0) {
      this.ballVX = (this.ballVX / mag) * this.ballSpeed;
      this.ballVY = (this.ballVY / mag) * this.ballSpeed;
    }

    this.ballX =
      side === 'left'
        ? paddleX + PADDLE_WIDTH + BALL_RADIUS
        : paddleX - BALL_RADIUS;
  }

  private afterGoal(scorer: Side) {
    if (this.scoreLeft >= WINNING_SCORE || this.scoreRight >= WINNING_SCORE) {
      this.status = 'finished';
      this.winner = this.scoreLeft >= WINNING_SCORE ? 'left' : 'right';
      return;
    }
    this.startCountdown(scorer === 'left' ? 1 : -1);
  }
}
