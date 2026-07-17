// presence/presence.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private userSockets = new Map<string, string>(); // userId -> socketId

  setOnline(userId: string, socketId: string) {
    this.userSockets.set(userId, socketId);
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