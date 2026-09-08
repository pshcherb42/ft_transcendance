/**
 * Game protocol types, shared between the local engine, the renderer and the
 * socket communication. The base fields must match those in the backend
 * (backend/src/websockets/pong-engine.ts).
 *
 * The OPTIONAL fields (obstacles, extra balls, power-ups, paddle heights) are
 * only filled by the LOCAL engine; the backend (online) snapshots don't carry
 * them and the renderer ignores them → online still renders the same.
 */

import type { PowerUpType, Obstacle } from './config';

export type Side = 'left' | 'right';
export type Dir = 'up' | 'down' | 'stop';
export type Status = 'countdown' | 'playing' | 'finished';

// Game mode chosen on the start screen.
export type Mode = 'online' | 'local' | 'ai' | 'tournament';

export interface BallView {
  x: number;
  y: number;
}

export interface PickupView {
  x: number;
  y: number;
  type: PowerUpType;
}

// Serializable state of a match at a given instant.
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

  // --- Optional (local mode only, with maps/power-ups) ---
  leftPaddleH?: number;
  rightPaddleH?: number;
  balls?: BallView[]; // all the balls when multiball is active
  obstacles?: Obstacle[];
  pickups?: PickupView[];
}
