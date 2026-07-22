/**
 * Renderer puro del Pong: dibuja un GameSnapshot en un canvas 2D.
 *
 * No conoce la física ni la red: recibe un estado (venga del motor local o del
 * servidor) y lo pinta. Así el mismo dibujo sirve para el modo local y el online.
 */

import {
  WIDTH,
  HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  LEFT_PADDLE_X,
  RIGHT_PADDLE_X,
  BALL_RADIUS,
  COLOR_BG,
  COLOR_FG,
  COLOR_ACCENT,
  FONT_SCORE,
  FONT_BIG,
  FONT_SMALL,
} from './constants';
import type { GameSnapshot, Side } from './types';

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
  // `side` (optional) highlights the player's paddle; only passed in online/AI mode.
  // `labels` (optional) supplies translated on-canvas text; falls back to English
  // defaults so this class never needs to know about i18next itself.
  draw(ctx: CanvasRenderingContext2D, s: GameSnapshot, side?: Side, labels: RendererLabels = DEFAULT_LABELS) {
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

    // Score
    ctx.fillStyle = COLOR_FG;
    ctx.font = FONT_SCORE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(s.scoreLeft), WIDTH / 4, 64);
    ctx.fillText(String(s.scoreRight), (WIDTH / 4) * 3, 64);

    // Paddles — highlight the player's own (online/AI mode only, when `side` is passed).
    ctx.fillStyle = side === 'left' ? COLOR_ACCENT : COLOR_FG;
    ctx.fillRect(LEFT_PADDLE_X, s.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = side === 'right' ? COLOR_ACCENT : COLOR_FG;
    ctx.fillRect(RIGHT_PADDLE_X, s.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = COLOR_FG; // restore for the ball

    // Ball
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Countdown before serve
    if (s.status === 'countdown' && s.countdown > 0) {
      ctx.fillStyle = COLOR_ACCENT;
      ctx.font = FONT_BIG;
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.countdown), WIDTH / 2, HEIGHT / 2 - 70);

      ctx.font = FONT_SMALL;
      ctx.fillText(labels.getReady, WIDTH / 2, HEIGHT / 2 - 20);
      ctx.textBaseline = 'alphabetic';
    }

    // Game over
    if (s.status === 'finished') {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.72)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLOR_FG;
      ctx.font = FONT_BIG;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // With `side` (AI and online modes) the message is personal: WIN / LOSE.
      // Without `side` (local 2-player) it names which side won.
      ctx.fillText(
        side
          ? s.winner === side
            ? labels.youWin
            : labels.youLose
          : s.winner === 'left'
            ? labels.leftWins
            : labels.rightWins,
        WIDTH / 2,
        HEIGHT / 2 - 24,
      );

      ctx.font = FONT_SCORE; // final score "5 - 3"
      ctx.fillText(`${s.scoreLeft} - ${s.scoreRight}`, WIDTH / 2, HEIGHT / 2 + 40);

      ctx.textBaseline = 'alphabetic';
    }
  }
}