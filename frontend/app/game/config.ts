/**
 * Configuración de una partida local: mapa y power-ups.
 *
 * SOLO afecta al modo local (el motor del frontend). El online usa el motor
 * autoritativo del backend, que no conoce esta config. Con `DEFAULT_CONFIG` el
 * motor se comporta exactamente como el Pong clásico.
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

// Definición de obstáculos por mapa (rectángulos AABB donde rebota la bola).
export const MAPS: Record<MapId, Obstacle[]> = {
  classic: [],
  // Dos bloques centrales dejando un hueco por el medio.
  obstacles: [
    { x: WIDTH / 2 - 10, y: 60, w: 20, h: 160 },
    { x: WIDTH / 2 - 10, y: HEIGHT - 220, w: 20, h: 160 },
  ],
};

export const MAP_LABEL: Record<MapId, string> = {
  classic: 'Clásico',
  obstacles: 'Obstáculos',
};
