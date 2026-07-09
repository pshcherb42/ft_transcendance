import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface PlayerState {
  userId: string;
  username: string;
  socketId: string;
  connected: boolean;
  paddleY: number;
  score: number;
}

export interface GameRoom {
  id: string;
  players: [PlayerState, PlayerState];
  ball: { x: number; y: number; vx: number; vy: number };
  status: 'active' | 'paused_disconnect' | 'finished';
  disconnectTimer?: NodeJS.Timeout;
  tournamentId?: string | null;
}

const RECONNECT_GRACE_MS = 10_000;

@Injectable()
export class GameRoomService {
  private readonly logger = new Logger(GameRoomService.name);

  private queue: { userId: string; username: string; socketId: string }[] = [];
  private rooms = new Map<string, GameRoom>();
  private userToRoom = new Map<string, string>(); // userId -> roomId

  enqueue(userId: string, username: string, socketId: string) {
    // Prevent double-queueing the same user
    this.queue = this.queue.filter((p) => p.userId !== userId);
    this.queue.push({ userId, username, socketId });
  }

  dequeue(userId: string) {
    this.queue = this.queue.filter((p) => p.userId !== userId);
  }

  tryMatch(): { roomId: string; room: GameRoom } | null {
    if (this.queue.length < 2) return null;

    const [p1, p2] = this.queue.splice(0, 2);
    const roomId = `room_${p1.userId}_${p2.userId}_${Date.now()}`;

    const room: GameRoom = {
      id: roomId,
      players: [
        { userId: p1.userId, username: p1.username, socketId: p1.socketId, connected: true, paddleY: 50, score: 0 },
        { userId: p2.userId, username: p2.username, socketId: p2.socketId, connected: true, paddleY: 50, score: 0 },
      ],
      ball: { x: 50, y: 50, vx: 1, vy: 1 },
      status: 'active',
      tournamentId: null,
    };

    this.rooms.set(roomId, room);
    this.userToRoom.set(p1.userId, roomId);
    this.userToRoom.set(p2.userId, roomId);

    return { roomId, room };
  }

  getRoomByUserId(userId: string): GameRoom | undefined {
    const roomId = this.userToRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  // Called on socket disconnect — starts grace period instead of instant forfeit
  handleDisconnect(userId: string, server: Server, onForfeit: (room: GameRoom, forfeitingUserId: string) => void) {
    const room = this.getRoomByUserId(userId);
    if (!room || room.status === 'finished') return;

    const player = room.players.find((p) => p.userId === userId);
    if (!player) return;

    player.connected = false;
    room.status = 'paused_disconnect';

    server.to(room.id).emit('opponentDisconnected', {
      userId,
      gracePeriodMs: RECONNECT_GRACE_MS,
    });

    room.disconnectTimer = setTimeout(() => {
      if (!player.connected) {
        room.status = 'finished';
        onForfeit(room, userId);
        this.cleanupRoom(room.id);
      }
    }, RECONNECT_GRACE_MS);
  }

  // Called when a user reconnects with a valid JWT — rejoin their existing room
  handleReconnect(userId: string, newSocketId: string, server: Server): GameRoom | null {
    const room = this.getRoomByUserId(userId);
    if (!room || room.status === 'finished') return null;

    const player = room.players.find((p) => p.userId === userId);
    if (!player) return null;

    player.connected = true;
    player.socketId = newSocketId;

    if (room.disconnectTimer) {
      clearTimeout(room.disconnectTimer);
      room.disconnectTimer = undefined;
    }

    // Resume only if both players are back
    const bothConnected = room.players.every((p) => p.connected);
    if (bothConnected) {
      room.status = 'active';
      server.to(room.id).emit('opponentReconnected', { userId });
    }

    return room;
  }

  cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players.forEach((p) => this.userToRoom.delete(p.userId));
    if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
    this.rooms.delete(roomId);
  }
}