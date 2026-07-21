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

export class PongRenderer {
  // `side` (opcional) resalta la pala del jugador; solo se pasa en modo online.
  draw(ctx: CanvasRenderingContext2D, s: GameSnapshot, side?: Side) {
    // Fondo
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Línea central discontinua
    ctx.strokeStyle = 'rgba(244, 244, 245, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 18]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Левая ракетка
    ctx.fillStyle = '#EDECE8';
    ctx.beginPath();
    ctx.roundRect(
      LEFT_PADDLE_X,
      s.leftPaddleY,
      12,
      90,
      6,
    );
    ctx.fill();

    // Правая ракетка
    ctx.fillStyle = '#9DA995';
    ctx.beginPath();
    ctx.roundRect(
      RIGHT_PADDLE_X,
      s.rightPaddleY,
      12,
      90,
      6,
    );
    ctx.fill();

    // Pelota
    ctx.fillStyle = '#EE4424';
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Cuenta atrás antes del saque
    if (s.status === 'countdown' && s.countdown > 0) {
      ctx.fillStyle = COLOR_ACCENT;
      ctx.font = FONT_BIG;
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
      // Con `side` (modo IA y online) el mensaje es personal: GANAS / PIERDES.
      // Sin `side` (local 2 jugadores) indica qué lado ganó.
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

      ctx.font = FONT_SCORE; // marcador final "5 - 3"
      ctx.fillText(`${s.scoreLeft} - ${s.scoreRight}`, WIDTH / 2, HEIGHT / 2 + 40);

      ctx.textBaseline = 'alphabetic';
    }
  }
}
