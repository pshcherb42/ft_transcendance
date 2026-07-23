/**
 * Renderer puro del Pong: dibuja un GameSnapshot en un canvas 2D.
 *
 * No conoce la física ni la red: recibe un estado y lo pinta.
 * Los obstáculos, power-ups, bolas extra y alturas variables
 * se dibujan solo cuando vienen en el snapshot.
 */

import {
  WIDTH,
  HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  LEFT_PADDLE_X,
  RIGHT_PADDLE_X,
  BALL_RADIUS,
  POWERUP_RADIUS,
  COLOR_BG,
  COLOR_ACCENT,
  COLOR_OBSTACLE,
  POWERUP_COLORS,
} from './constants';

import type { GameSnapshot, Side } from './types';

const POWERUP_LETTER: Record<string, string> = {
  grow: '+',
  shrink: '–',
  speed: 'V',
  multiball: 'M',
};

export interface RendererLabels {
  getReady: string;
  youWin: string;
  youLose: string;
  leftWins: string;
  rightWins: string;
}

const DEFAULT_LABELS: RendererLabels = {
  getReady: 'GET READY',
  youWin: 'YOU WIN!',
  youLose: 'YOU LOSE',
  leftWins: 'LEFT WINS',
  rightWins: 'RIGHT WINS',
};

export class PongRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    s: GameSnapshot,
    side?: Side,
    labels: RendererLabels = DEFAULT_LABELS,
  ) {
    const leftH = s.leftPaddleH ?? PADDLE_HEIGHT;
    const rightH = s.rightPaddleH ?? PADDLE_HEIGHT;

    // Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Dashed center line
    ctx.strokeStyle = 'rgba(244, 244, 245, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 18]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Obstacles
    if (s.obstacles) {
      ctx.fillStyle = COLOR_OBSTACLE;

      for (const obstacle of s.obstacles) {
        ctx.beginPath();
        ctx.roundRect(
          obstacle.x,
          obstacle.y,
          obstacle.w,
          obstacle.h,
          8,
        );
        ctx.fill();
      }
    }

    // Left paddle
    // Left paddle
    ctx.fillStyle = '#EDECE8';

    ctx.beginPath();
    ctx.roundRect(
      LEFT_PADDLE_X,
      s.leftPaddleY,
      PADDLE_WIDTH,
      leftH,
      6,
    );
    ctx.fill();

    // Right paddle
    // Right paddle
    ctx.fillStyle = '#9DA995';

    ctx.beginPath();
    ctx.roundRect(
      RIGHT_PADDLE_X,
      s.rightPaddleY,
      PADDLE_WIDTH,
      rightH,
      6,
    );
    ctx.fill();

    // Collectible power-ups
    if (s.pickups) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const pickup of s.pickups) {
        ctx.fillStyle =
          POWERUP_COLORS[pickup.type] ??
          COLOR_ACCENT;

        ctx.beginPath();
        ctx.arc(
          pickup.x,
          pickup.y,
          POWERUP_RADIUS,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.fillStyle = '#EDECE8';
        ctx.font =
          'bold 20px "Courier New", monospace';

        ctx.fillText(
          POWERUP_LETTER[pickup.type] ?? '?',
          pickup.x,
          pickup.y + 1,
        );
      }

      ctx.textBaseline = 'alphabetic';
    }

    // Balls
    ctx.fillStyle = '#EE4424';

    if (s.balls?.length) {
      for (const ball of s.balls) {
        ctx.beginPath();
        ctx.arc(
          ball.x,
          ball.y,
          BALL_RADIUS,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(
        s.ballX,
        s.ballY,
        BALL_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Custom countdown
    if (
      s.status === 'countdown' &&
      s.countdown > 0
    ) {
      ctx.save();

      ctx.fillStyle = '#EE4424';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font =
        '400 86px "Gasoek One", sans-serif';

      ctx.fillText(
        String(s.countdown),
        WIDTH / 2,
        HEIGHT / 2,
      );

      ctx.restore();
    }
  }
}