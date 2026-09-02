import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class PresenceService {
  private userSockets = new Map<string, string>();
  private offlineTimers = new Map<string, NodeJS.Timeout>();
  private server: Server | null = null;

  setOnline(userId: string, socketId: string, onConfirmedOnline: () => void) {
    const pendingOffline = this.offlineTimers.get(userId);
    if (pendingOffline) {
      // Reconnected before the offline broadcast ever fired — friends never
      // saw "offline", so don't tell them "online" either. Nothing changed
      // from their point of view.
      clearTimeout(pendingOffline);
      this.offlineTimers.delete(userId);
      this.userSockets.set(userId, socketId);
      return;
    }

    // Already had a live socket (e.g. the kicked-reconnect path) — friends
    // already think this user is online, no need to re-broadcast.
    const wasOnline = this.userSockets.has(userId);
    this.userSockets.set(userId, socketId);

    if (!wasOnline) {
      onConfirmedOnline();
    }
  }

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown): boolean {
    const socketId = this.userSockets.get(userId);
    if (!socketId || !this.server) return false;

    const sock = this.server.sockets.sockets.get(socketId);
    if (!sock || !sock.connected) {
      this.userSockets.delete(userId);
      return false;
    }
    sock.emit(event, payload);
    return true;
  }

  setOffline(userId: string, socketId: string, onConfirmedOffline: () => void) {
    if (this.userSockets.get(userId) !== socketId) return;

    this.userSockets.delete(userId);

    const timer = setTimeout(() => {
      if (!this.userSockets.has(userId)) {
        onConfirmedOffline();
      }
      this.offlineTimers.delete(userId);
    }, 3000);

    this.offlineTimers.set(userId, timer);
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
