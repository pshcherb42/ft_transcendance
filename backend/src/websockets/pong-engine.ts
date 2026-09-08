/**
 * PURE, authoritative Pong engine.
 *
 * No dependency on NestJS, sockets or canvas: just physics and state. That makes
 * it easy to test and reusable. The backend uses it as the source of truth for
 * every online match; the frontend has an identical mirror for local mode.
 *
 * ⚠️ The CONSTANTS and the physics must stay IN SYNC with
 *    frontend/app/game/constants.ts and frontend/app/game/pong-engine.ts
 */

export type Side = 'left' | 'right';
export type Dir = 'up' | 'down' | 'stop';
export type Status = 'countdown' | 'playing' | 'finished';

// Serializable snapshot sent to the client on every tick.
export interface GameSnapshot {
  status: Status;
  countdown: number; // seconds left before the serve (0 if already playing)
  leftPaddleY: number;
  rightPaddleY: number;
  ballX: number;
  ballY: number;
  scoreLeft: number;
  scoreRight: number;
  winner: Side | null;
}

// --- Field dimensions (px) ---
export const WIDTH = 1066;
export const HEIGHT = 578;

// --- Paddles ---
export const PADDLE_WIDTH = 12;
export const PADDLE_HEIGHT = 90;
export const PADDLE_SPEED = 11; // bumped up from 8 so the game doesn't feel sluggish
export const LEFT_PADDLE_X = 24;
export const RIGHT_PADDLE_X = WIDTH - 24 - PADDLE_WIDTH; // 764

// --- Ball ---
export const BALL_RADIUS = 9;
export const BALL_SPEED_START = 7;
export const BALL_SPEED_MAX = 15;
export const BALL_SPEEDUP = 0.6; // added on every paddle hit
export const MAX_BOUNCE_RAD = Math.PI / 4; // 45º max deflection
export const SERVE_JITTER_RAD = Math.PI / 36; // ±5° random variation on the serve
export const BALL_SPIN = 0.25; // vertical drag of the paddle on the ball (spin)

// --- Match ---
export const WINNING_SCORE = 5;
export const TICK_RATE = 30; // ticks per second
export const COUNTDOWN_TICKS = TICK_RATE * 3; // 3 second countdown

export class PongEngine {
  leftPaddleY: number;
  rightPaddleY: number;

  ballX = WIDTH / 2;
  ballY = HEIGHT / 2;
  ballVX = 0;
  ballVY = 0;
  ballSpeed = BALL_SPEED_START;

  leftPaddleVY = 0; // REAL vertical displacement of the paddle in the last tick (post-clamp)
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
    // Initial serve in a random direction.
    this.serveDir = Math.random() < 0.5 ? 1 : -1;
  }

  // Records a paddle's movement intent.
  setInput(side: Side, dir: Dir) {
    const input = side === 'left' ? this.leftInput : this.rightInput;
    input.up = dir === 'up';
    input.down = dir === 'down';
  }

  // Advances the simulation by one tick (call at TICK_RATE Hz).
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

  // ------------------------------------------------------------------ private

  private movePaddles() {
    const prevLeft = this.leftPaddleY;
    const prevRight = this.rightPaddleY;

    if (this.leftInput.up) this.leftPaddleY -= PADDLE_SPEED;
    if (this.leftInput.down) this.leftPaddleY += PADDLE_SPEED;
    if (this.rightInput.up) this.rightPaddleY -= PADDLE_SPEED;
    if (this.rightInput.down) this.rightPaddleY += PADDLE_SPEED;

    this.leftPaddleY = clamp(this.leftPaddleY, 0, HEIGHT - PADDLE_HEIGHT);
    this.rightPaddleY = clamp(this.rightPaddleY, 0, HEIGHT - PADDLE_HEIGHT);

    // Real vertical velocity of each paddle this tick (after the clamp): if the
    // paddle is pinned against an edge its velocity is 0 and it imparts no spin.
    this.leftPaddleVY = this.leftPaddleY - prevLeft;
    this.rightPaddleVY = this.rightPaddleY - prevRight;
  }

  // Places the ball in the center and starts the countdown before the serve.
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

  // Launches the ball when the countdown ends.
  private serve() {
    this.status = 'playing';

    // Vertical center of the paddle that will receive the serve.
    const targetY =
      this.serveDir === 1
        ? this.rightPaddleY + PADDLE_HEIGHT / 2
        : this.leftPaddleY + PADDLE_HEIGHT / 2;

    // Horizontal distance (>0) from the center to the face of the receiving paddle.
    const dx =
      this.serveDir === 1
        ? RIGHT_PADDLE_X - this.ballX
        : this.ballX - (LEFT_PADDLE_X + PADDLE_WIDTH);

    // Angle pointing at the center of the receiving paddle + a small variation,
    // clamped to a safe, reachable cone (±MAX_BOUNCE_RAD).
    const aim = Math.atan2(targetY - this.ballY, dx);
    const jitter = (Math.random() * 2 - 1) * SERVE_JITTER_RAD;
    const angle = clamp(aim + jitter, -MAX_BOUNCE_RAD, MAX_BOUNCE_RAD);

    this.ballVX = this.serveDir * this.ballSpeed * Math.cos(angle);
    this.ballVY = this.ballSpeed * Math.sin(angle);
  }

  private moveBall() {
    this.ballX += this.ballVX;
    this.ballY += this.ballVY;

    // Bounce off ceiling and floor (with a correction so it doesn't stick).
    if (this.ballY - BALL_RADIUS <= 0) {
      this.ballY = BALL_RADIUS;
      this.ballVY = Math.abs(this.ballVY);
    } else if (this.ballY + BALL_RADIUS >= HEIGHT) {
      this.ballY = HEIGHT - BALL_RADIUS;
      this.ballVY = -Math.abs(this.ballVY);
    }

    this.bounceOnPaddle('left');
    this.bounceOnPaddle('right');

    // Goals.
    if (this.ballX - BALL_RADIUS <= 0) {
      this.scoreRight++;
      this.afterGoal('right');
    } else if (this.ballX + BALL_RADIUS >= WIDTH) {
      this.scoreLeft++;
      this.afterGoal('left');
    }
  }

  // Bounce off a paddle with an angle that depends on the impact point and a
  // progressive speed increase.
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

    // Impact position relative to the paddle center: [-1, 1].
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

    // Spin: the paddle's real vertical velocity drags the ball.
    const paddleVY = side === 'left' ? this.leftPaddleVY : this.rightPaddleVY;
    this.ballVY += BALL_SPIN * paddleVY;

    // Renormalize: spin curves the trajectory but does NOT change the speed
    // magnitude, so |v| stays exactly ballSpeed (<= BALL_SPEED_MAX).
    const mag = Math.hypot(this.ballVX, this.ballVY);
    if (mag > 0) {
      this.ballVX = (this.ballVX / mag) * this.ballSpeed;
      this.ballVY = (this.ballVY / mag) * this.ballSpeed;
    }

    // Push the ball out of the paddle to avoid multiple bounces.
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
    // Serve toward the player who just conceded the point.
    this.startCountdown(scorer === 'left' ? 1 : -1);
  }
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
