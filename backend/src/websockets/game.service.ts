import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { PongEngine, Side, Dir, TICK_RATE } from './pong-engine';
import { MatchService } from './match.service';

interface Room {
  engine: PongEngine;
  leftUserId: string;
  rightUserId: string;
  loop: NodeJS.Timeout;
}

/**
 * Orquesta las partidas online: por cada sala mantiene un PongEngine
 * autoritativo, corre su bucle a TICK_RATE Hz, difunde el estado a los dos
 * clientes y, al terminar, emite el resultado y lo persiste.
 */
@Injectable()
export class GameService {
  private rooms: Map<string, Room> = new Map();

  constructor(private matchService: MatchService) {}

  createGame(
    roomId: string,
    leftUserId: string,
    rightUserId: string,
    server: Server,
  ) {
    const engine = new PongEngine();

    const loop = setInterval(() => {
      engine.step();
      server.to(roomId).emit('gameState', engine.getSnapshot());

      if (engine.status === 'finished' && engine.winner) {
        server.to(roomId).emit('gameOver', { winner: engine.winner });
        this.persist(roomId, engine.winner);
        this.removeGame(roomId);
      }
    }, 1000 / TICK_RATE);

    this.rooms.set(roomId, { engine, leftUserId, rightUserId, loop });
  }

  setPlayerInput(roomId: string, side: Side, dir: Dir) {
    this.rooms.get(roomId)?.engine.setInput(side, dir);
  }

  removeGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      clearInterval(room.loop);
      this.rooms.delete(roomId);
    }
  }

  // Guarda el resultado en la BD (fire-and-forget; el MatchService gestiona errores).
  private persist(roomId: string, winner: Side) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const { engine, leftUserId, rightUserId } = room;
    void this.matchService.record({
      homeId: leftUserId,
      awayId: rightUserId,
      homeScore: engine.scoreLeft,
      awayScore: engine.scoreRight,
      winnerId: winner === 'left' ? leftUserId : rightUserId,
    });
  }
}
