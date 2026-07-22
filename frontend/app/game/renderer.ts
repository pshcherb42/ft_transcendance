/**
 * Renderer puro del Pong: dibuja un GameSnapshot en un canvas 2D.
 *
 * No conoce la física ni la red: recibe un estado (venga del motor local o del
 * servidor) y lo pinta. Los campos opcionales del snapshot (obstáculos, bolas
 * extra, power-ups, alturas de pala) se dibujan solo si vienen → los snapshots
 * del backend (online) no los traen y el dibujo es exactamente el de siempre.
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
  COLOR_FG,
  COLOR_ACCENT,
  COLOR_OBSTACLE,
  POWERUP_COLORS,
  FONT_SCORE,
  FONT_BIG,
  FONT_SMALL,
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
  // `side` (optional) highlights the player's paddle; only passed in online/AI mode.
  // `labels` (optional) supplies translated on-canvas text; falls back to English
  // defaults so this class never needs to know about i18next itself.
  draw(ctx: CanvasRenderingContext2D, s: GameSnapshot, side?: Side, labels: RendererLabels = DEFAULT_LABELS) {
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

    // Score
    ctx.fillStyle = COLOR_FG;
    ctx.font = FONT_SCORE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(s.scoreLeft), WIDTH / 4, 64);
    ctx.fillText(String(s.scoreRight), (WIDTH / 4) * 3, 64);

    // Palas — altura variable (power-ups) y resalte del jugador si llega `side`.
    // Paddles — highlight the player's own (online/AI mode only, when `side` is passed).
    ctx.fillStyle = side === 'left' ? COLOR_ACCENT : COLOR_FG;
    ctx.fillRect(LEFT_PADDLE_X, s.leftPaddleY, PADDLE_WIDTH, leftH);
    ctx.fillStyle = side === 'right' ? COLOR_ACCENT : COLOR_FG;
    ctx.fillRect(RIGHT_PADDLE_X, s.rightPaddleY, PADDLE_WIDTH, rightH);

    // Power-ups recogibles
    if (s.pickups) {
      ctx.textBaseline = 'middle';
      for (const p of s.pickups) {
        ctx.fillStyle = POWERUP_COLORS[p.type] ?? COLOR_ACCENT;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POWERUP_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a0a';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillText(POWERUP_LETTER[p.type] ?? '?', p.x, p.y + 1);
      }
      ctx.textBaseline = 'alphabetic';
    }

    // Pelota(s)
    ctx.fillStyle = COLOR_FG;
    if (s.balls) {
      for (const b of s.balls) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
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
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.countdown), WIDTH / 2, HEIGHT / 2 - 70);

      ctx.font = FONT_SMALL;
      ctx.fillText(labels.getReady, WIDTH / 2, HEIGHT / 2 - 20);
      ctx.textBaseline = 'alphabetic';
    }

    if (s.status === 'countdown' && s.countdown > 0) {
      ctx.save();
    
      ctx.fillStyle = '#EE4424';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    
      ctx.font = '400 86px "Gasoek One", sans-serif';
    
      ctx.fillText(
        String(s.countdown),
        WIDTH / 2,
        HEIGHT / 2,
      );
    
      ctx.restore();
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