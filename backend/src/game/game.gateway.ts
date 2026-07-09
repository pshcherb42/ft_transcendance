import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameRoomService } from './game-room.service';
import { PrismaClient } from "../generated/prisma/client"; 

@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: process.env.FRONTEND_URL || 'https://localhost:8080',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);
  
  // CORRECCIÓN 1: Declaramos e instanciamos la propiedad de Prisma dentro de la clase
  private readonly prisma = new PrismaClient();

  constructor(
    private jwtService: JwtService,
    private roomService: GameRoomService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      client.data.userId = payload.sub;
      client.data.username = payload.username;
    } catch {
      client.disconnect();
      return;
    }

    const existingRoom = this.roomService.handleReconnect(client.data.userId, client.id, this.server);
    if (existingRoom) {
      client.join(existingRoom.id);
      client.emit('rejoinedGame', { roomId: existingRoom.id, room: existingRoom });
    }

    this.logger.log(`Client connected: ${client.data.userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    this.roomService.dequeue(userId); 

    // CORRECCIÓN 2: Añadimos 'async' al callback de la función para permitir usar await con Prisma
    this.roomService.handleDisconnect(userId, this.server, async (room, forfeitingUserId) => {
      const winner = room.players.find((p) => p.userId !== forfeitingUserId);
      
      // CORRECCIÓN 3: Garantizamos un string no indefinido para cumplir con el esquema estricto de Prisma
      const finalWinnerId = winner?.userId || 'UNKNOWN';

      this.server.to(room.id).emit('gameOver', {
        reason: 'forfeit',
        winnerId: finalWinnerId,
        forfeitedBy: forfeitingUserId,
      });

      try {
        const homePlayer = room.players[0];
        const awayPlayer = room.players[1];
        
        if (homePlayer && awayPlayer) {
          await this.prisma.match.create({
            data: {
              homeId: homePlayer.userId,
              awayId: awayPlayer.userId,
              homeScore: homePlayer.userId === finalWinnerId ? 3 : 0,
              awayScore: awayPlayer.userId === finalWinnerId ? 3 : 0,
              winnerId: finalWinnerId,
              tournamentId: room.tournamentId || null, 
            },
          });
          this.logger.log(`Partida guardada con éxito en la base de datos.`);
        }
      } catch (error) {
        this.logger.error(`Error al persistir la partida:`, error);
      } // CORRECCIÓN 4: Se cerró correctamente el bloque try
    }); // CORRECCIÓN 5: Se cerró correctamente el bloque if de arriba

    this.logger.log(`Client disconnected: ${userId}`);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(@ConnectedSocket() client: Socket) {
    const { userId, username } = client.data;
    this.roomService.enqueue(userId, username, client.id);

    const match = this.roomService.tryMatch();
    if (match) {
      const { roomId, room } = match;
      room.players.forEach((p) => {
        this.server.sockets.sockets.get(p.socketId)?.join(roomId);
      });
      this.server.to(roomId).emit('matchFound', { roomId, room });
    } else {
      client.emit('queued');
    }
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.roomService.dequeue(client.data.userId);
  }

  @SubscribeMessage('paddleMove')
  handlePaddleMove(@ConnectedSocket() client: Socket, @MessageBody() data: { y: number }) {
    const room = this.roomService.getRoomByUserId(client.data.userId);
    if (!room || room.status !== 'active') return;

    const player = room.players.find((p) => p.userId === client.data.userId);
    if (player) player.paddleY = data.y;

    client.to(room.id).emit('opponentPaddleMove', { userId: client.data.userId, y: data.y });
  }
}
