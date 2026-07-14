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

export class PongRenderer {
  // `side` (opcional) resalta la pala del jugador; solo se pasa en modo online / IA.
  draw(ctx: CanvasRenderingContext2D, s: GameSnapshot, side?: Side) {
    const leftH = s.leftPaddleH ?? PADDLE_HEIGHT;
    const rightH = s.rightPaddleH ?? PADDLE_HEIGHT;

    // Fondo
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Obstáculos (si el mapa los tiene)
    if (s.obstacles) {
      ctx.fillStyle = COLOR_OBSTACLE;
      for (const o of s.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
    }

    // Línea central discontinua
    ctx.strokeStyle = 'rgba(244, 244, 245, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 18]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marcador
    ctx.fillStyle = COLOR_FG;
    ctx.font = FONT_SCORE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(s.scoreLeft), WIDTH / 4, 64);
    ctx.fillText(String(s.scoreRight), (WIDTH / 4) * 3, 64);

    // Palas — altura variable (power-ups) y resalte del jugador si llega `side`.
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

    // Cuenta atrás antes del saque
    if (s.status === 'countdown' && s.countdown > 0) {
      ctx.fillStyle = COLOR_ACCENT;
      ctx.font = FONT_BIG;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.countdown), WIDTH / 2, HEIGHT / 2 - 70);

      ctx.font = FONT_SMALL;
      ctx.fillText('PREPÁRATE', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.textBaseline = 'alphabetic';
    }

    // Fin de partida
    if (s.status === 'finished') {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.72)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLOR_FG;
      ctx.font = FONT_BIG;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        side
          ? s.winner === side
            ? '¡GANAS!'
            : 'PIERDES'
          : s.winner === 'left'
            ? 'GANA IZQUIERDA'
            : 'GANA DERECHA',
        WIDTH / 2,
        HEIGHT / 2 - 24,
      );

      ctx.font = FONT_SCORE;
      ctx.fillText(`${s.scoreLeft} - ${s.scoreRight}`, WIDTH / 2, HEIGHT / 2 + 40);
      ctx.textBaseline = 'alphabetic';
    }
  }
}
