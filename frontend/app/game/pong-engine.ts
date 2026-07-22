/**
 * Motor de Pong del frontend (modo LOCAL: 2 jugadores, vs IA y torneo).
 *
 * Es un espejo del motor autoritativo del backend
 * (backend/src/websockets/pong-engine.ts) para la física base, pero además es
 * CONFIGURABLE: acepta un GameConfig con mapa (obstáculos) y power-ups.
 *
 * ⚠️ Con `DEFAULT_CONFIG` (sin obstáculos ni power-ups) el comportamiento es
 *    EXACTAMENTE el del Pong clásico — no debe cambiar. Toda la lógica nueva va
 *    detrás de `obstacles.length` / `config.powerups`. En modo online NO se usa
 *    este motor: el servidor calcula la física y el cliente solo pinta el snapshot.
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
  POWERUP_RADIUS,
  POWERUP_SPAWN_TICKS,
  POWERUP_MAX,
  POWERUP_EFFECT_TICKS,
  PADDLE_GROW_FACTOR,
  PADDLE_SHRINK_FACTOR,
  PADDLE_MIN_HEIGHT,
  PADDLE_MAX_HEIGHT,
  SPEED_POWERUP_FACTOR,
  SPEED_POWERUP_CAP,
  MAX_BALLS,
} from './constants';
import {
  DEFAULT_CONFIG,
  MAPS,
  type GameConfig,
  type Obstacle,
  type PowerUpType,
} from './config';
import type { Side, Dir, Status, GameSnapshot } from './types';

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  lastHitBy: Side | null; // última pala que la golpeó (para asignar power-ups)
}

interface Pickup {
  x: number;
  y: number;
  type: PowerUpType;
}

const POWERUP_TYPES: PowerUpType[] = ['grow', 'shrink', 'speed', 'multiball'];

export class PongEngine {
  private config: GameConfig;
  private obstacles: Obstacle[];

  balls: Ball[]; // público: la IA lee las bolas entrantes

  leftPaddleY: number;
  rightPaddleY: number;
  leftPaddleVY = 0;
  rightPaddleVY = 0;
  leftPaddleH = PADDLE_HEIGHT;
  rightPaddleH = PADDLE_HEIGHT;

  scoreLeft = 0;
  scoreRight = 0;
  status: Status = 'countdown';
  winner: Side | null = null;

  private countdownTicks = COUNTDOWN_TICKS;
  private serveDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  private leftInput = { up: false, down: false };
  private rightInput = { up: false, down: false };

  private pickups: Pickup[] = [];
  private spawnTicks = POWERUP_SPAWN_TICKS;
  private leftEffectTicks = 0; // ticks restantes del efecto de tamaño en la pala izq.
  private rightEffectTicks = 0;

  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.obstacles = MAPS[config.map];
    this.leftPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;
    this.rightPaddleY = (HEIGHT - PADDLE_HEIGHT) / 2;
    this.balls = [this.centerBall()];
  }

  // Compatibilidad: la bola "principal" (la IA y el snapshot base la usan).
  get ballX() { return this.balls[0]?.x ?? WIDTH / 2; }
  get ballY() { return this.balls[0]?.y ?? HEIGHT / 2; }
  get ballVX() { return this.balls[0]?.vx ?? 0; }
  get ballVY() { return this.balls[0]?.vy ?? 0; }
  get ballSpeed() { return this.balls[0]?.speed ?? BALL_SPEED_START; }

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

    this.moveBalls();

    if (this.config.powerups) {
      this.tickEffects();
      this.trySpawnPickup();
    }
  }

  getSnapshot(): GameSnapshot {
    const main = this.balls[0];
    const snap: GameSnapshot = {
      status: this.status,
      countdown:
        this.status === 'countdown'
          ? Math.ceil(this.countdownTicks / TICK_RATE)
          : 0,
      leftPaddleY: this.leftPaddleY,
      rightPaddleY: this.rightPaddleY,
      ballX: main?.x ?? WIDTH / 2,
      ballY: main?.y ?? HEIGHT / 2,
      scoreLeft: this.scoreLeft,
      scoreRight: this.scoreRight,
      winner: this.winner,
    };
    // Campos opcionales: solo cuando aportan algo (clásico → snapshot idéntico a antes).
    if (this.obstacles.length) snap.obstacles = this.obstacles;
    if (this.balls.length > 1) {
      snap.balls = this.balls.map((b) => ({ x: b.x, y: b.y }));
    }
    if (this.config.powerups) {
      snap.leftPaddleH = this.leftPaddleH;
      snap.rightPaddleH = this.rightPaddleH;
      if (this.pickups.length) {
        snap.pickups = this.pickups.map((p) => ({ x: p.x, y: p.y, type: p.type }));
      }
    }
    return snap;
  }

  // ------------------------------------------------------------------ privados

  private centerBall(): Ball {
    return {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      speed: BALL_SPEED_START,
      lastHitBy: null,
    };
  }

  private movePaddles() {
    const prevLeft = this.leftPaddleY;
    const prevRight = this.rightPaddleY;

    if (this.leftInput.up) this.leftPaddleY -= PADDLE_SPEED;
    if (this.leftInput.down) this.leftPaddleY += PADDLE_SPEED;
    if (this.rightInput.up) this.rightPaddleY -= PADDLE_SPEED;
    if (this.rightInput.down) this.rightPaddleY += PADDLE_SPEED;

    this.leftPaddleY = clamp(this.leftPaddleY, 0, HEIGHT - this.leftPaddleH);
    this.rightPaddleY = clamp(this.rightPaddleY, 0, HEIGHT - this.rightPaddleH);

    this.leftPaddleVY = this.leftPaddleY - prevLeft;
    this.rightPaddleVY = this.rightPaddleY - prevRight;
  }

  private startCountdown(serveDir: 1 | -1) {
    this.status = 'countdown';
    this.countdownTicks = COUNTDOWN_TICKS;
    this.serveDir = serveDir;
    this.balls = [this.centerBall()]; // vuelve a una sola bola en el centro
  }

  private serve() {
    this.status = 'playing';
    const ball = this.balls[0];

    const targetY =
      this.serveDir === 1
        ? this.rightPaddleY + this.rightPaddleH / 2
        : this.leftPaddleY + this.leftPaddleH / 2;
    const dx =
      this.serveDir === 1
        ? RIGHT_PADDLE_X - ball.x
        : ball.x - (LEFT_PADDLE_X + PADDLE_WIDTH);

    const aim = Math.atan2(targetY - ball.y, dx);
    const jitter = (Math.random() * 2 - 1) * SERVE_JITTER_RAD;
    const angle = clamp(aim + jitter, -MAX_BOUNCE_RAD, MAX_BOUNCE_RAD);

    ball.vx = this.serveDir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  private moveBalls() {
    let scored: Side | null = null;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Paredes.
      if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS;
        ball.vy = Math.abs(ball.vy);
      } else if (ball.y + BALL_RADIUS >= HEIGHT) {
        ball.y = HEIGHT - BALL_RADIUS;
        ball.vy = -Math.abs(ball.vy);
      }

      if (this.obstacles.length) this.bounceOnObstacles(ball);
      this.bounceOnPaddle(ball, 'left');
      this.bounceOnPaddle(ball, 'right');
      if (this.config.powerups) this.collectPickups(ball);

      // Goles.
      if (ball.x - BALL_RADIUS <= 0) {
        this.scoreRight++;
        scored = 'right';
        this.balls.splice(i, 1);
      } else if (ball.x + BALL_RADIUS >= WIDTH) {
        this.scoreLeft++;
        scored = 'left';
        this.balls.splice(i, 1);
      }
    }

    if (!scored) return;

    if (this.scoreLeft >= WINNING_SCORE || this.scoreRight >= WINNING_SCORE) {
      this.status = 'finished';
      this.winner = this.scoreLeft >= WINNING_SCORE ? 'left' : 'right';
    } else if (this.balls.length === 0) {
      // Sin bolas en juego → saque hacia quien acaba de encajar el punto.
      this.startCountdown(scored === 'left' ? 1 : -1);
    }
  }

  private bounceOnPaddle(ball: Ball, side: Side) {
    const paddleX = side === 'left' ? LEFT_PADDLE_X : RIGHT_PADDLE_X;
    const paddleY = side === 'left' ? this.leftPaddleY : this.rightPaddleY;
    const paddleH = side === 'left' ? this.leftPaddleH : this.rightPaddleH;
    const movingToward = side === 'left' ? ball.vx < 0 : ball.vx > 0;
    if (!movingToward) return;

    const overlapX =
      ball.x - BALL_RADIUS < paddleX + PADDLE_WIDTH &&
      ball.x + BALL_RADIUS > paddleX;
    const overlapY =
      ball.y + BALL_RADIUS > paddleY && ball.y - BALL_RADIUS < paddleY + paddleH;
    if (!overlapX || !overlapY) return;

    const relative = clamp(
      (ball.y - (paddleY + paddleH / 2)) / (paddleH / 2),
      -1,
      1,
    );
    const angle = relative * MAX_BOUNCE_RAD;
    ball.speed = Math.min(ball.speed + BALL_SPEEDUP, BALL_SPEED_MAX);

    const dirX = side === 'left' ? 1 : -1;
    ball.vx = dirX * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);

    const paddleVY = side === 'left' ? this.leftPaddleVY : this.rightPaddleVY;
    ball.vy += BALL_SPIN * paddleVY;

    const mag = Math.hypot(ball.vx, ball.vy);
    if (mag > 0) {
      ball.vx = (ball.vx / mag) * ball.speed;
      ball.vy = (ball.vy / mag) * ball.speed;
    }

    ball.x =
      side === 'left'
        ? paddleX + PADDLE_WIDTH + BALL_RADIUS
        : paddleX - BALL_RADIUS;
    ball.lastHitBy = side;
  }

  // Rebote círculo–AABB por eje de menor penetración (sin quedar pegada).
  private bounceOnObstacles(ball: Ball) {
    for (const o of this.obstacles) {
      const closestX = clamp(ball.x, o.x, o.x + o.w);
      const closestY = clamp(ball.y, o.y, o.y + o.h);
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      if (dx * dx + dy * dy >= BALL_RADIUS * BALL_RADIUS) continue;

      const overlapLeft = ball.x + BALL_RADIUS - o.x;
      const overlapRight = o.x + o.w - (ball.x - BALL_RADIUS);
      const overlapTop = ball.y + BALL_RADIUS - o.y;
      const overlapBottom = o.y + o.h - (ball.y - BALL_RADIUS);
      const minX = Math.min(overlapLeft, overlapRight);
      const minY = Math.min(overlapTop, overlapBottom);

      if (minX < minY) {
        if (overlapLeft < overlapRight) {
          ball.x = o.x - BALL_RADIUS;
          if (ball.vx > 0) ball.vx = -ball.vx;
        } else {
          ball.x = o.x + o.w + BALL_RADIUS;
          if (ball.vx < 0) ball.vx = -ball.vx;
        }
      } else {
        if (overlapTop < overlapBottom) {
          ball.y = o.y - BALL_RADIUS;
          if (ball.vy > 0) ball.vy = -ball.vy;
        } else {
          ball.y = o.y + o.h + BALL_RADIUS;
          if (ball.vy < 0) ball.vy = -ball.vy;
        }
      }
    }
  }

  // -------------------------------------------------------------- power-ups

  private collectPickups(ball: Ball) {
    if (!ball.lastHitBy) return; // nadie la ha tocado aún → no se puede asignar
    const reach = POWERUP_RADIUS + BALL_RADIUS;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      if (dx * dx + dy * dy <= reach * reach) {
        this.applyPowerup(p.type, ball.lastHitBy, ball);
        this.pickups.splice(i, 1);
      }
    }
  }

  private applyPowerup(type: PowerUpType, side: Side, ball: Ball) {
    if (type === 'grow') {
      this.setPaddleHeight(side, PADDLE_HEIGHT * PADDLE_GROW_FACTOR);
      this.setEffectTimer(side);
    } else if (type === 'shrink') {
      const opp: Side = side === 'left' ? 'right' : 'left';
      this.setPaddleHeight(opp, PADDLE_HEIGHT * PADDLE_SHRINK_FACTOR);
      this.setEffectTimer(opp);
    } else if (type === 'speed') {
      ball.speed = Math.min(ball.speed * SPEED_POWERUP_FACTOR, SPEED_POWERUP_CAP);
      const mag = Math.hypot(ball.vx, ball.vy);
      if (mag > 0) {
        ball.vx = (ball.vx / mag) * ball.speed;
        ball.vy = (ball.vy / mag) * ball.speed;
      }
    } else if (type === 'multiball') {
      if (this.balls.length < MAX_BALLS) {
        const vy = ball.vy !== 0 ? -ball.vy : ball.speed * 0.5;
        this.balls.push({
          x: ball.x,
          y: ball.y,
          vx: ball.vx,
          vy,
          speed: ball.speed,
          lastHitBy: side,
        });
      }
    }
  }

  private setPaddleHeight(side: Side, h: number) {
    const height = clamp(h, PADDLE_MIN_HEIGHT, PADDLE_MAX_HEIGHT);
    if (side === 'left') {
      this.leftPaddleH = height;
      this.leftPaddleY = clamp(this.leftPaddleY, 0, HEIGHT - height);
    } else {
      this.rightPaddleH = height;
      this.rightPaddleY = clamp(this.rightPaddleY, 0, HEIGHT - height);
    }
  }

  private setEffectTimer(side: Side) {
    if (side === 'left') this.leftEffectTicks = POWERUP_EFFECT_TICKS;
    else this.rightEffectTicks = POWERUP_EFFECT_TICKS;
  }

  private tickEffects() {
    if (this.leftEffectTicks > 0 && --this.leftEffectTicks === 0) {
      this.setPaddleHeight('left', PADDLE_HEIGHT);
    }
    if (this.rightEffectTicks > 0 && --this.rightEffectTicks === 0) {
      this.setPaddleHeight('right', PADDLE_HEIGHT);
    }
  }

  private trySpawnPickup() {
    if (this.status !== 'playing') return;
    if (--this.spawnTicks > 0) return;
    this.spawnTicks = POWERUP_SPAWN_TICKS;
    if (this.pickups.length >= POWERUP_MAX) return;

    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    this.pickups.push({
      x: WIDTH * 0.3 + Math.random() * WIDTH * 0.4, // banda central
      y: 60 + Math.random() * (HEIGHT - 120),
      type,
    });
  }
}
