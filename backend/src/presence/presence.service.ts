// presence/presence.service.ts
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class PresenceService {
  private userSockets = new Map<string, string>(); // userId -> socketId
  private server: Server | null = null;

  setOnline(userId: string, socketId: string) {
    this.userSockets.set(userId, socketId);
  }

  setServer(server: Server) {   // ADD THIS — called once from the gateway
      this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown) {   // ADD THIS
    const socketId = this.userSockets.get(userId);
     if (socketId && this.server) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  setOffline(userId: string, socketId: string) {
    // Only clear if this socket is still the one on record — same guard
    // logic you already use for kicked sockets.
    if (this.userSockets.get(userId) === socketId) {
      this.userSockets.delete(userId);
    }
  }

  getSocketId(userId: string): string | undefined {
    return this.userSockets.get(userId);
  }

  isOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUserIds(): string[] {
    return [...this.userSockets.keys()];
  }
}