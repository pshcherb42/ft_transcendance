/**
 * Pong constants (frontend).
 *
 * ⚠️ The PHYSICS constants must match EXACTLY those in
 *    backend/src/websockets/pong-engine.ts so local mode looks and behaves
 *    the same as online mode (which runs on the server).
 */

// --- Field ---
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
export const BALL_SPEEDUP = 0.6;
export const MAX_BOUNCE_RAD = Math.PI / 4;
export const SERVE_JITTER_RAD = Math.PI / 36; // ±5° random variation on the serve
export const BALL_SPIN = 0.25;                // vertical drag of the paddle on the ball (spin)

// --- Match ---
export const WINNING_SCORE = 5;
export const TICK_RATE = 30;
export const COUNTDOWN_TICKS = TICK_RATE * 3;

// --- Power-ups and multiball (LOCAL mode ONLY) ---
export const POWERUP_RADIUS = 16;
export const POWERUP_SPAWN_TICKS = TICK_RATE * 5; // one appears every ~5 s
export const POWERUP_MAX = 2; // max on the field at once
export const POWERUP_EFFECT_TICKS = TICK_RATE * 8; // duration of the paddle effects (~8 s)
export const PADDLE_GROW_FACTOR = 1.6; // grows your paddle
export const PADDLE_SHRINK_FACTOR = 0.6; // shrinks the opponent's
export const PADDLE_MIN_HEIGHT = 45;
export const PADDLE_MAX_HEIGHT = 170;
export const SPEED_POWERUP_FACTOR = 1.4; // speeds up the ball that picks it up
export const SPEED_POWERUP_CAP = BALL_SPEED_MAX * 1.4; // speed cap with the power-up
export const MAX_BALLS = 4; // max simultaneous balls with multiball

// Colors of the obstacles and of each power-up type (used by the renderer).
export const COLOR_OBSTACLE = '#52525b';
export const POWERUP_COLORS: Record<string, string> = {
  grow: '#5B8DEF',      // soft blue
  shrink: '#C87AB6',    // dusty fuchsia
  speed: '#F2A65A',     // warm amber
  multiball: '#7B6EF6', // rich purple
};

// --- Style (used only by the renderer) ---
export const COLOR_BG = '#0a0a0a';
export const COLOR_FG = '#f4f4f5';
export const COLOR_ACCENT = '#4ade80';
export const FONT_SCORE = '48px "Courier New", monospace';
export const FONT_BIG = '64px "Courier New", monospace';
export const FONT_SMALL = '22px "Courier New", monospace';
