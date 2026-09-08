/**
 * Configuration for a local match: map and power-ups.
 *
 * ONLY affects local mode (the frontend engine). Online uses the backend's
 * authoritative engine, which doesn't know about this config. With
 * `DEFAULT_CONFIG` the engine behaves exactly like classic Pong.
 */

import { WIDTH, HEIGHT } from './constants';

export type MapId = 'classic' | 'obstacles';
export type PowerUpType = 'grow' | 'shrink' | 'speed' | 'multiball';

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameConfig {
  map: MapId;
  powerups: boolean;
}

export const DEFAULT_CONFIG: GameConfig = { map: 'classic', powerups: false };

// Obstacle definitions per map (AABB rectangles the ball bounces off).
export const MAPS: Record<MapId, Obstacle[]> = {
  classic: [],
  // Two central blocks leaving a gap in the middle.
  obstacles: [
    { x: WIDTH / 2 - 10, y: 60, w: 20, h: 160 },
    { x: WIDTH / 2 - 10, y: HEIGHT - 220, w: 20, h: 160 },
  ],
};

export const MAP_LABEL: Record<MapId, string> = {
  classic: 'Classic',
  obstacles: 'Obstacles',
};
