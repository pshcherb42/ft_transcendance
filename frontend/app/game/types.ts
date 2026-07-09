/**
 * Tipos del protocolo del juego, compartidos entre el motor local, el renderer
 * y la comunicación por socket. Deben coincidir con los del backend
 * (backend/src/websockets/pong-engine.ts).
 */

export type Side = 'left' | 'right';
export type Dir = 'up' | 'down' | 'stop';
export type Status = 'countdown' | 'playing' | 'finished';

// Modo de juego elegido en la pantalla de inicio.
export type Mode = 'menu' | 'online' | 'local' | 'ai';

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
}
