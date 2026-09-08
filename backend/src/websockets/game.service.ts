import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PongEngine, Side, Dir, TICK_RATE } from './pong-engine';
import { MatchService } from './match.service';
import { encode } from '@msgpack/msgpack';

const RECONNECT_GRACE_MS = 15_000;

interface Room {
  engine: PongEngine;
  leftUserId: string;
  rightUserId: string;
  loop: NodeJS.Timeout | null; // null while paused for a disconnect
  disconnectedUserId: string | null;
  disconnectTimer: NodeJS.Timeout | null;
  pausedSince: number | null;
  emptySince: number | null;
}

/**
 * Orchestrates the online matches: for each room it keeps an authoritative
 * PongEngine, runs its loop at TICK_RATE Hz, broadcasts the state, and now
 * also handles disconnects with a grace period (15s) before declaring a
 * forfeit.
 */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private rooms: Map<string, Room> = new Map();
  private userToRoom: Map<string, string> = new Map(); // userId -> roomId
  private server: Server | null = null;
  private watchdog: NodeJS.Timeout | null = null;
  private static readonly EMPTY_GRACE_MS = 30_000;
  private static readonly PAUSE_GRACE_MS = 45_000;

  constructor(private matchService: MatchService) {}

  createGame(
    roomId: string,
    leftUserId: string,
    rightUserId: string,
    server: Server,
  ) {
    // Neither player should still be mapped to a room.
    //  If one is, something upstream let two games overlap.
    // Just tear that old room down (no more "empty rooms").
    for (const uid of [leftUserId, rightUserId]) {
      const existingRoomId = this.userToRoom.get(uid);
      if (existingRoomId && existingRoomId !== roomId) {
        this.logger.warn(
          `createGame: ${uid} still in ${existingRoomId}, removing before starting ${roomId}`,
        );
        this.removeGame(existingRoomId, server);
      }
    }
    this.server = server;
    const room: Room = {
      engine: new PongEngine(),
      leftUserId,
      rightUserId,
      loop: null,
      disconnectedUserId: null,
      disconnectTimer: null,
      pausedSince: null,
      emptySince: null,
    };
    this.rooms.set(roomId, room);
    this.userToRoom.set(leftUserId, roomId);
    this.userToRoom.set(rightUserId, roomId);
    this.startLoop(roomId, server);
    this.startWatchdog();
  }

  // Every 10s: drop rooms that have been empty for > 30s or frozen for > 45s.
  // Catches games both players abandoned without quitting — otherwise the room
  // lingers forever and traps both players in it on their next online match.
  private startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => this.sweepRooms(), 10_000);
  }

  private sweepRooms() {
    const server = this.server;
    if (!server) return;
    const now = Date.now();

    for (const [roomId, room] of this.rooms) {
      if (room.engine.status === 'finished') continue;

      const n = server.sockets.adapter.rooms.get(roomId)?.size ?? 0;
      if (n === 0) {
        room.emptySince ??= now;
        if (now - room.emptySince > GameService.EMPTY_GRACE_MS) {
          this.logger.warn(`🧹 Voiding abandoned room ${roomId}`);
          server.to(roomId).emit('matchVoided', { reason: 'abandoned' });
          this.removeGame(roomId, server);
          continue;
        }
      } else {
        room.emptySince = null;
      }
      if (!room.loop && !room.disconnectTimer) {
        room.pausedSince ??= now;
        if (now - room.pausedSince > GameService.PAUSE_GRACE_MS) {
          this.logger.warn(`🧹 Voiding stalled room ${roomId}`);
          server.to(roomId).emit('matchVoided', { reason: 'stalled' });
          this.removeGame(roomId, server);
          continue;
        }
      } else if (room.loop) {
        room.pausedSince = null;
      }
    }
    if (this.rooms.size === 0 && this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }

  resumeIfReady(roomId: string, server: Server, bothConnected: boolean) {
    const room = this.rooms.get(roomId);
    if (!room || room.engine.status === 'finished') return;
    if (room.loop || room.disconnectedUserId || room.disconnectTimer) return;
    if (!bothConnected) return;
    room.pausedSince = null;
    this.startLoop(roomId, server);
  }

  private startLoop(roomId: string, server: Server) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.loop = setInterval(() => {
      room.engine.step();
      server.to(roomId).emit('gameState', encode(room.engine.getSnapshot()));

      if (room.engine.status === 'finished' && room.engine.winner) {
        const winnerId =
          room.engine.winner === 'left' ? room.leftUserId : room.rightUserId;
        server.to(roomId).emit('gameOver', {
          reason: 'score',
          winner: room.engine.winner,
          winnerId,
        });
        this.persist(roomId, room.engine.winner);
        this.removeGame(roomId, server);
      }
    }, 1000 / TICK_RATE);
  }

  setPlayerInput(roomId: string, side: Side, dir: Dir) {
    this.rooms.get(roomId)?.engine.setInput(side, dir);
  }

  getRoomIdByUserId(userId: string): string | undefined {
    return this.userToRoom.get(userId);
  }

  getRoomPlayers(
    roomId: string,
  ): { leftUserId: string; rightUserId: string } | undefined {
    const room = this.rooms.get(roomId);
    return room
      ? { leftUserId: room.leftUserId, rightUserId: room.rightUserId }
      : undefined;
  }

  // Called when a user leaves voluntarily (leaveGame) — unlike
  // handleDisconnect, there's no grace period: a forfeit is declared
  // instantly because we know it was a deliberate exit, not a network
  // drop.
  forfeitImmediately(userId: string, server: Server) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.engine.status === 'finished') {
      this.removeGame(roomId, server);
      return;
    }

    // Cancel any grace-period timer that might already be running for this
    // room (e.g. opponent had briefly dropped) — we're ending the match now
    // regardless of that state.
    if (room.disconnectTimer) {
      clearTimeout(room.disconnectTimer);
      room.disconnectTimer = null;
    }
    if (room.loop) {
      clearInterval(room.loop);
      room.loop = null;
    }

    const winnerSide: Side = userId === room.leftUserId ? 'right' : 'left';
    const winnerId = winnerSide === 'left' ? room.leftUserId : room.rightUserId;

    server.to(roomId).emit('gameOver', {
      reason: 'forfeit',
      winner: winnerSide,
      winnerId,
      forfeitedBy: userId,
    });

    this.logger.log(
      `💾 Saving match after voluntary forfeit. Winner: ${winnerId}`,
    );
    this.matchService
      .record({
        homeId: room.leftUserId || '',
        awayId: room.rightUserId || '',
        homeScore: room.engine.scoreLeft,
        awayScore: room.engine.scoreRight,
        winnerId: winnerId || '',
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`❌ Error persisting voluntary forfeit: ${msg}`);
      });

    this.removeGame(roomId, server);
  }

  // Called when a socket disconnects: pauses the loop and starts a grace
  // timer. If it expires without a reconnection, the opponent wins by forfeit.
  handleDisconnect(userId: string, server: Server) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    // A player is already disconnected (and it's not this same one) -> BOTH left.
    // No forfeit is possible, there's nobody to "win". Cancel the match as if
    // it never happened: no persisting, no declaring a winner.
    if (room.disconnectedUserId && room.disconnectedUserId !== userId) {
      if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
      server.to(roomId).emit('matchVoided', { reason: 'both-disconnected' });
      this.removeGame(roomId, server);
      return;
    }

    room.disconnectedUserId = userId; // assign disconnected user

    if (room.loop) {
      clearInterval(room.loop); // stop room timer and clear
      room.loop = null;
    }
    // warn the opponent that the user was disconnected
    server.to(roomId).emit('opponentDisconnected', {
      userId,
      gracePeriodMs: RECONNECT_GRACE_MS,
    });
    // initialize the timer
    room.disconnectTimer = setTimeout(() => {
      try {
        if (room.disconnectedUserId === userId) {
          // determine the disconnected side
          const winnerSide: Side =
            userId === room.leftUserId ? 'right' : 'left';
          const winnerId =
            winnerSide === 'left' ? room.leftUserId : room.rightUserId;
          // notify the other user that the game is over
          server.to(roomId).emit('gameOver', {
            reason: 'forfeit',
            winner: winnerSide, // <-- this is what the frontend actually reads
            winnerId, // keep for your matchService.record() call below
            forfeitedBy: userId,
          });

          this.logger.log(
            `💾 Saving match after forfeit. Winner: ${winnerId}`,
          );
          // write match result to the database
          void this.matchService.record({
            homeId: room.leftUserId || '',
            awayId: room.rightUserId || '',
            homeScore: room.engine.scoreLeft,
            awayScore: room.engine.scoreRight,
            winnerId: winnerId || '',
          });
          // clear the room
          this.removeGame(roomId, server);
        }
      } catch (dbError: unknown) {
        // 3. If the database fails (e.g. typing issues), catch the error so it does NOT freeze the queue
        const dbMsg =
          dbError instanceof Error ? dbError.message : String(dbError);
        this.logger.error(`❌ Error saving record to the DB: ${dbMsg}`);
        // Force the room cleanup anyway so we don't break the app
        this.removeGame(roomId, server);
      }
    }, RECONNECT_GRACE_MS);
  }

  // Called when a user reconnects with a valid JWT before the grace period
  // expires. Returns the roomId if there was an active room.
  handleReconnect(userId: string, server: Server): string | null {
    const roomId = this.userToRoom.get(userId); // find the right room
    if (!roomId) return null;
    const room = this.rooms.get(roomId); // assign the room
    if (!room || room.disconnectedUserId !== userId) return null;

    room.disconnectedUserId = null; // clean this variable
    if (room.disconnectTimer) {
      clearTimeout(room.disconnectTimer); // clear the timer
      room.disconnectTimer = null;
    }

    server.to(roomId).emit('opponentReconnected', { userId }); // emit notification to server that the user reconnected
    return roomId; // return roomId
  }

  removeGame(roomId: string, server?: Server) {
    const room = this.rooms.get(roomId); // search for roomId
    if (room) {
      if (room.loop) clearInterval(room.loop); // clear room timer
      if (room.disconnectTimer) clearTimeout(room.disconnectTimer); // disconnect timer
      if (server) {
        const roomSockets = server.sockets.adapter.rooms.get(roomId); // what sockets are connected to this room
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const socket = server.sockets.sockets.get(socketId);
            if (socket) {
              const data = socket.data as { roomId?: string; side?: Side };
              data.roomId = undefined; // clean this socket room
              data.side = undefined; // clear the side
              void socket.leave(roomId); // takeout socket from the room
            }
          }
        }
      }
      this.userToRoom.delete(room.leftUserId);
      this.userToRoom.delete(room.rightUserId);
      this.rooms.delete(roomId);
    }
  }

  private persist(roomId: string, winner: Side) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const { engine, leftUserId, rightUserId } = room;

    // Wrap the normal save in a controlled safe path as well
    this.matchService
      .record({
        homeId: leftUserId || '',
        awayId: rightUserId || '',
        homeScore: engine.scoreLeft,
        awayScore: engine.scoreRight,
        winnerId: winner === 'left' ? leftUserId : rightUserId,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`❌ Error persisting normal match: ${msg}`);
      });
  }
}
