/**
 * Tipos del protocolo del juego, compartidos entre el motor local, el renderer
 * y la comunicación por socket. Los campos base deben coincidir con los del
 * backend (backend/src/websockets/pong-engine.ts).
 *
 * Los campos OPCIONALES (obstáculos, bolas extra, power-ups, alturas de pala)
 * solo los rellena el motor LOCAL; los snapshots del backend (online) no los
 * traen y el renderer los ignora → el online sigue pintándose igual.
 */

import type { PowerUpType, Obstacle } from './config';

export type Side = 'left' | 'right';
export type Dir = 'up' | 'down' | 'stop';
export type Status = 'countdown' | 'playing' | 'finished';

// Modo de juego elegido en la pantalla de inicio.
export type Mode = 'menu' | 'online' | 'local' | 'ai' | 'tournament';

export interface BallView {
  x: number;
  y: number;
}

export interface PickupView {
  x: number;
  y: number;
  type: PowerUpType;
}

// Estado serializable de una partida en un instante dado.
export interface GameSnapshot {
  status: Status;
  countdown: number; // segundos que faltan para el saque (0 si ya se juega)
  leftPaddleY: number;
  rightPaddleY: number;
  ballX: number;
  ballY: number;
  scoreLeft: number;
  scoreRight: number;
  winner: Side | null;

  // --- Opcionales (solo modo local con mapas/power-ups) ---
  leftPaddleH?: number;
  rightPaddleH?: number;
  balls?: BallView[]; // todas las bolas cuando hay multibola
  obstacles?: Obstacle[];
  pickups?: PickupView[];
}
