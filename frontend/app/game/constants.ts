/**
 * Constantes del Pong (frontend).
 *
 * ⚠️ Las constantes de FÍSICA deben coincidir EXACTAMENTE con
 *    backend/src/websockets/pong-engine.ts para que el modo local se vea y se
 *    comporte igual que el modo online (que corre en el servidor).
 */

// --- Campo ---
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
export const BALL_SPEEDUP = 0.6;
export const MAX_BOUNCE_RAD = Math.PI / 4;
export const SERVE_JITTER_RAD = Math.PI / 36; // ±5° de variación aleatoria en el saque
export const BALL_SPIN = 0.25;                // arrastre vertical de la pala sobre la bola (spin)

// --- Partida ---
export const WINNING_SCORE = 5;
export const TICK_RATE = 30;
export const COUNTDOWN_TICKS = TICK_RATE * 3;

// --- Power-ups y multibola (SOLO modo local) ---
export const POWERUP_RADIUS = 16;
export const POWERUP_SPAWN_TICKS = TICK_RATE * 5; // aparece uno cada ~5 s
export const POWERUP_MAX = 2; // máximo en el campo a la vez
export const POWERUP_EFFECT_TICKS = TICK_RATE * 8; // duración de los efectos de pala (~8 s)
export const PADDLE_GROW_FACTOR = 1.6; // agranda tu pala
export const PADDLE_SHRINK_FACTOR = 0.6; // encoge la del rival
export const PADDLE_MIN_HEIGHT = 45;
export const PADDLE_MAX_HEIGHT = 170;
export const SPEED_POWERUP_FACTOR = 1.4; // acelera la bola que lo recoge
export const SPEED_POWERUP_CAP = BALL_SPEED_MAX * 1.4; // tope de velocidad con el power-up
export const MAX_BALLS = 4; // tope de bolas simultáneas con multibola

// Colores de los obstáculos y de cada tipo de power-up (los usa el renderer).
export const COLOR_OBSTACLE = '#52525b';
export const POWERUP_COLORS: Record<string, string> = {
  grow: '#4ade80', // verde
  shrink: '#f87171', // rojo
  speed: '#fbbf24', // amarillo
  multiball: '#60a5fa', // azul
};

// --- Estilo (solo lo usa el renderer) ---
export const COLOR_BG = '#0a0a0a';
export const COLOR_FG = '#f4f4f5';
export const COLOR_ACCENT = '#4ade80';
export const FONT_SCORE = '48px "Courier New", monospace';
export const FONT_BIG = '64px "Courier New", monospace';
export const FONT_SMALL = '22px "Courier New", monospace';
