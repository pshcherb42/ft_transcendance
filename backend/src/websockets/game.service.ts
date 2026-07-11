import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PongEngine, Side, Dir, TICK_RATE } from './pong-engine';
import { MatchService } from './match.service';

const RECONNECT_GRACE_MS = 15_000;

interface Room {
  engine: PongEngine;
  leftUserId: string;
  rightUserId: string;
  loop: NodeJS.Timeout | null; // null while paused for a disconnect
  disconnectedUserId: string | null;
  disconnectTimer: NodeJS.Timeout | null;
}

/**
 * Orquesta las partidas online: por cada sala mantiene un PongEngine
 * autoritativo, corre su bucle a TICK_RATE Hz, difunde el estado, y ahora
 * también gestiona desconexiones con periodo de gracia (15s) antes de
 * declarar forfeit.
 */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private rooms: Map<string, Room> = new Map();
  private userToRoom: Map<string, string> = new Map(); // userId -> roomId

  constructor(private matchService: MatchService) {}

  createGame(roomId: string, leftUserId: string, rightUserId: string, server: Server) {
    const room: Room = {
      engine: new PongEngine(),
      leftUserId,
      rightUserId,
      loop: null,
      disconnectedUserId: null,
      disconnectTimer: null,
    };
    this.rooms.set(roomId, room);
    this.userToRoom.set(leftUserId, roomId);
    this.userToRoom.set(rightUserId, roomId);
    this.startLoop(roomId, server);
  }

  private startLoop(roomId: string, server: Server) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.loop = setInterval(() => {
      room.engine.step();
      server.to(roomId).emit('gameState', room.engine.getSnapshot());

      if (room.engine.status === 'finished' && room.engine.winner) {
        const winnerId = room.engine.winner === 'left' ? room.leftUserId : room.rightUserId;
        server.to(roomId).emit('gameOver', { reason: 'score', winner: room.engine.winner, winnerId });
        this.persist(roomId, room.engine.winner);
        this.removeGame(roomId);
      }
    }, 1000 / TICK_RATE);
  }

  setPlayerInput(roomId: string, side: Side, dir: Dir) {
    this.rooms.get(roomId)?.engine.setInput(side, dir);
  }

  getRoomIdByUserId(userId: string): string | undefined {
    return this.userToRoom.get(userId);
  }

  getRoomPlayers(roomId: string): { leftUserId: string; rightUserId: string } | undefined {
    const room = this.rooms.get(roomId);
    return room ? { leftUserId: room.leftUserId, rightUserId: room.rightUserId } : undefined;
  }

  // Llamado al desconectarse un socket: pausa el bucle y arranca un timer de
  // gracia. Si expira sin reconexión, el rival gana por abandono.
  handleDisconnect(userId: string, server: Server) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.disconnectedUserId = userId;

    if (room.loop) {
      clearInterval(room.loop);
      room.loop = null;
    }

    server.to(roomId).emit('opponentDisconnected', { userId, gracePeriodMs: RECONNECT_GRACE_MS });

    room.disconnectTimer = setTimeout(() => {
      if (room.disconnectedUserId === userId) {
        const winnerId = userId === room.leftUserId ? room.rightUserId : room.leftUserId;
        server.to(roomId).emit('gameOver', { reason: 'forfeit', winnerId, forfeitedBy: userId });

        void this.matchService.record({
          homeId: room.leftUserId,
          awayId: room.rightUserId,
          homeScore: room.engine.scoreLeft,
          awayScore: room.engine.scoreRight,
          winnerId,
        });

        this.removeGame(roomId);
      }
    }, RECONNECT_GRACE_MS);
  }

  // Llamado cuando un usuario reconecta con un JWT válido antes de que
  // expire el periodo de gracia. Devuelve el roomId si había una sala activa.
  handleReconnect(userId: string, server: Server): string | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room || room.disconnectedUserId !== userId) return null;

    room.disconnectedUserId = null;
    if (room.disconnectTimer) {
      clearTimeout(room.disconnectTimer);
      room.disconnectTimer = null;
    }
    if (!room.loop) this.startLoop(roomId, server);

    server.to(roomId).emit('opponentReconnected', { userId });
    return roomId;
  }

  removeGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.loop) clearInterval(room.loop);
      if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
      this.userToRoom.delete(room.leftUserId);
      this.userToRoom.delete(room.rightUserId);
      this.rooms.delete(roomId);
    }
  }

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
