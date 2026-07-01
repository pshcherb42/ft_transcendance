import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

interface GameState {
  roomId: string;
  p1Y: number;
  p2Y: number;
  ballX: number;
  ballY: number;
}

@Injectable()
export class GameService {
  private activeGames: Map<string, GameState> = new Map();

  startGame(roomId: string, server: Server) {
    const gameState: GameState = { roomId, p1Y: 50, p2Y: 50, ballX: 50, ballY: 50 };
    this.activeGames.set(roomId, gameState);

    // Bucle de juego a 30 FPS
    setInterval(() => {
      if (!this.activeGames.has(roomId)) return;

      // Aquí iría tu lógica de física de la pelota
      // Ejemplo: gameState.ballX += 1;
      
      server.to(roomId).emit('gameStateUpdate', this.activeGames.get(roomId));
    }, 1000 / 30);
  }

  updatePaddle(roomId: string, player: 'p1' | 'p2', y: number) {
    const game = this.activeGames.get(roomId);
    if (game) {
      if (player === 'p1') game.p1Y = y;
      else game.p2Y = y;
    }
  }

  removeGame(roomId: string) {
    this.activeGames.delete(roomId);
  }
}