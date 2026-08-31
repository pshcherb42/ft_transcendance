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

  createGame(
    roomId: string,
    leftUserId: string,
    rightUserId: string,
    server: Server,
  ) {
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

  // Llamado cuando un usuario abandona voluntariamente (leaveGame) — a
  // diferencia de handleDisconnect, no hay periodo de gracia: se declara
  // forfeit al instante porque sabemos que fue una salida deliberada, no
  // una caída de red.
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
      `💾 Guardando partida por abandono voluntario. Ganador: ${winnerId}`,
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
        this.logger.error(`❌ Error persistiendo forfeit voluntario: ${msg}`);
      });

    this.removeGame(roomId, server);
  }

  // Llamado al desconectarse un socket: pausa el bucle y arranca un timer de
  // gracia. Si expira sin reconexión, el rival gana por abandono.
  handleDisconnect(userId: string, server: Server) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Ya hay un jugador desconectado (y no es este mismo) -> los DOS se fueron.
    // No hay forfeit posible, no hay nadie para "ganar". Cancelamos la partida
    // como si nunca hubiera pasado: sin persistir, sin declarar ganador.
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
            `💾 Guardando partida por abandono. Ganador: ${winnerId}`,
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
        // 3. Si la base de datos falla por tipado, atrapamos el error para que NO congele la cola
        const dbMsg =
          dbError instanceof Error ? dbError.message : String(dbError);
        this.logger.error(`❌ Error al guardar registro en la BD: ${dbMsg}`);
        // Forzamos la limpieza de la sala de todos modos para no romper la app
        this.removeGame(roomId, server);
      }
    }, RECONNECT_GRACE_MS);
  }

  // Llamado cuando un usuario reconecta con un JWT válido antes de que
  // expire el periodo de gracia. Devuelve el roomId si había una sala activa.
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
    if (!room.loop) this.startLoop(roomId, server); // start room loop again

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

    // Envolvemos el guardado normal también en un hilo seguro controlado
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
        this.logger.error(`❌ Error persistiendo partida normal: ${msg}`);
      });
  }
}
