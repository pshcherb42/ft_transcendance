/**
 * Motor de Pong PURO y autoritativo.
 *
 * No depende de NestJS, sockets ni canvas: solo física y estado. Esto lo hace
 * fácil de testear y reutilizable. El backend lo usa como fuente de verdad de
 * cada partida online; el frontend tiene un espejo idéntico para el modo local.
 *
 * ⚠️ Las CONSTANTES y la física deben mantenerse SINCRONIZADAS con
 *    frontend/app/game/constants.ts y frontend/app/game/pong-engine.ts
 */

export type Side = 'left' | 'right';
export type Dir = 'up' | 'down' | 'stop';
export type Status = 'countdown' | 'playing' | 'finished';

// Snapshot serializable que se envía al cliente en cada tick.
export interface GameSnapshot {
  status: Status;
  countdown: number; // segundos que faltan para el saque (0 si ya se juega)
  leftPaddleY: number;
  rightPaddleY: number;
  ballX: number;
  ballY: number;
  scoreLeft: number;
  scoreRight: number;
  winner: Side | null;
}

// --- Dimensiones del campo (px) ---
export const WIDTH = 1066;
export const HEIGHT = 578;

// --- Palas ---
export const PADDLE_WIDTH = 12;
export const PADDLE_HEIGHT = 90;
export const PADDLE_SPEED = 11; // subido de 8 para que el juego no se sienta lento
export const LEFT_PADDLE_X = 24;
export const RIGHT_PADDLE_X = WIDTH - 24 - PADDLE_WIDTH; // 764

// --- Pelota ---
export const BALL_RADIUS = 9;
export const BALL_SPEED_START = 7;
export const BALL_SPEED_MAX = 15;
export const BALL_SPEEDUP = 0.6; // se suma en cada golpe de pala
export const MAX_BOUNCE_RAD = Math.PI / 4; // 45º de deflexión máxima
export const SERVE_JITTER_RAD = Math.PI / 36; // ±5° de variación aleatoria en el saque
export const BALL_SPIN = 0.25; // arrastre vertical de la pala sobre la bola (spin)

// --- Partida ---
export const WINNING_SCORE = 5;
export const TICK_RATE = 30; // ticks por segundo
export const COUNTDOWN_TICKS = TICK_RATE * 3; // 3 segundos de cuenta atrás

export class PongEngine {
  leftPaddleY: number;
  rightPaddleY: number;

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
  private serveDir: 1 | -1;

  private leftInput = { up: false, down: false };
  private rightInput = { up: false, down: false };

  constructor() {
    this.leftPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;
    this.rightPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;
    // Saque inicial en dirección aleatoria.
    this.serveDir = Math.random() < 0.5 ? 1 : -1;
  }

  // Registra la intención de movimiento de una pala.
  setInput(side: Side, dir: Dir) {
    const input = side === 'left' ? this.leftInput : this.rightInput;
    input.up = dir === 'up';
    input.down = dir === 'down';
  }

  // Avanza la simulación un tick (llamar a TICK_RATE Hz).
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
      countdown: this.status === 'countdown'
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

  // Coloca la pelota en el centro y arranca la cuenta atrás antes del saque.
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

  // Lanza la pelota al terminar la cuenta atrás.
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

    // Rebote en techo y suelo (con corrección para no quedar pegada).
    if (this.ballY - BALL_RADIUS <= 0) {
      this.ballY = BALL_RADIUS;
      this.ballVY = Math.abs(this.ballVY);
    } else if (this.ballY + BALL_RADIUS >= HEIGHT) {
      this.ballY = HEIGHT - BALL_RADIUS;
      this.ballVY = -Math.abs(this.ballVY);
    }

    this.bounceOnPaddle('left');
    this.bounceOnPaddle('right');

    // Goles.
    if (this.ballX - BALL_RADIUS <= 0) {
      this.scoreRight++;
      this.afterGoal('right');
    } else if (this.ballX + BALL_RADIUS >= WIDTH) {
      this.scoreLeft++;
      this.afterGoal('left');
    }
  }

  // Rebote contra una pala con ángulo dependiente del punto de impacto y
  // aumento progresivo de la velocidad.
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

    // Posición relativa del impacto respecto al centro de la pala: [-1, 1].
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

    // Sacamos la pelota de la pala para evitar rebotes múltiples.
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
    // Saca hacia el jugador que acaba de encajar el punto.
    this.startCountdown(scorer === 'left' ? 1 : -1);
  }
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
