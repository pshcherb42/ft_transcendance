import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GameService } from './game.service';
import { Side, Dir } from './pong-engine';
import { PresenceService } from '../presence/presence.service';
import { FriendsService } from '../friends/friends.service';
import { OnGatewayInit } from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { send } from 'process';

// Enable CORS just like on HTTP so the frontend can connect.
// 8080 = access via nginx (same origin as the app); 3000 = frontend directly in dev.
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // 1. Allow if origin is missing or coming from internal Docker networks
      if (
        !origin ||
        origin.includes('frontend') ||
        origin.includes('backend')
      ) {
        return callback(null, true);
      }

      // 2. Comprehensive validation rule checks
      const allowed =
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https:\/\/transcendance\.rmanzanas\.com$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
        /^https?:\/\/[a-zA-Z0-9_-]+(:\d+)?$/.test(origin) || // Matches raw hostname mappings
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
        /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
        // 172.16.0.0/12: Docker's default network and phone hotspot (172.20.10.x)
        /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(
          origin,
        );

      if (allowed) {
        callback(null, true);
      } else {
        console.warn(
          `⚠️ WebSocket connection blocked by CORS from origin: ${origin}`,
        );
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  },
})
export class WebsocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  // Matchmaking queue: sockets waiting for an opponent.
  private queue: Socket[] = [];
  private userSockets = new Map<string, string>(); // userId -> current socketId
  private kickedSockets = new Set<string>(); // sockets we deliberately disconnected

  private pendingInvites = new Map<
    string,
    {
      inviteId: string;
      senderId: string;
      senderUsername: string;
      receiverId: string;
      gameRoomId: string;
      timeout: NodeJS.Timeout;
    }
  >();

  private chatHistory = new Map<
    string,
    {
      id: string;
      senderId: string;
      senderUsername: string | null;
      receiverId: string;
      text: string;
      timestamp: number;
    }[]
  >();

  private readonly MAX_HISTORY_PER_CONVO = 200;
  private readonly MAX_OUTGOING_INVITES = 5;

  private chatKey(a: string, b: string) {
    return [a, b].sort().join(':');
  }

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private gameService: GameService,
    private presence: PresenceService,
    private friendsService: FriendsService,
  ) {}

  // This method fires automatically when a client tries to connect
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) throw new Error('No token provided'); // clients want to open a socket and sends a secret credential

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }); // backend checks if the token is real and then discifer it

      client.data.user = payload; // identify this connection with users identity
      const userId = payload.sub;
      console.log(`Client connected: ${client.id} | User ID: ${payload.sub}`);

      // --- Single-session enforcement: special case, same userId reconnecting ---
      const existingSocketId = this.presence.getSocketId(userId);
      if (existingSocketId && existingSocketId !== client.id) {
        const existingSocket =
          this.server.sockets.sockets.get(existingSocketId);
        if (existingSocket && existingSocket.connected) {
          console.log(
            `Kicking previous session ${existingSocketId} for user ${userId}`,
          );
          // Flag it BEFORE disconnecting, so handleDisconnect knows to skip
          // all game/reconnect logic for this socket entirely.
          this.kickedSockets.add(existingSocketId);
          existingSocket.emit('forceDisconnect', {
            reason: 'Logged in from another location',
          });
          existingSocket.disconnect(true);
        } else if (existingSocket) {
          //zombie leftover from dropped connection. Needs to be cleaned up
          this.kickedSockets.add(existingSocketId);
          existingSocket.disconnect(true);
        }
      }
      this.presence.setOnline(userId, client.id, () => {
        void this.friendsService.notifyFriendsOfPresence(
          userId,
          true,
          this.server,
          this.presence,
        );
      });
      // --- end single-session enforcement ---

      // Room takeover: if the user has a live room, rejoin instantly.
      // This is a direct lookup, NOT handleReconnect — no grace-period
      // state was ever touched, so there's nothing to "reconnect" from.

      // Genuine drop-and-reconnect path (different scenario entirely —
      // real network loss, grace timer already running).
      this.gameService.handleReconnect(userId, this.server);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`Connection rejected: ${client.id} | Error: ${msg}`);
      client.disconnect();
    }
  }

  // This method fires when a client closes the tab or loses internet
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    console.log('DISCONNECT', client.id, client.data.roomId);
    // checks sockets, if finds one identical, eliminates it
    this.queue = this.queue.filter((s) => s.id !== client.id); // delete the user from the queue
    // Special case: this socket was deliberately kicked by a new login.
    // Skip gameService entirely — no forfeit, no grace timer, nothing.
    // The new socket already took over the room, if any, in handleConnection.
    if (this.kickedSockets.has(client.id)) {
      this.kickedSockets.delete(client.id);
      const userId: string | undefined = client.data.user?.sub;
      // Only clean the map if it's not already pointing to a newer socket.
      if (userId && this.presence.getSocketId(userId) === client.id) {
        this.userSockets.delete(userId);
      }
      return; // <-- stop here, no gameService.handleDisconnect call
    }

    // extract and guard the actual player state
    const userId: string | undefined = client.data.user?.sub;
    const roomId: string | undefined = client.data.roomId;

    if (userId && this.presence.getSocketId(userId) === client.id) {
      this.presence.setOffline(userId, client.id, () => {
        void this.friendsService.notifyFriendsOfPresence(
          userId,
          false,
          this.server,
          this.presence,
        );
      });
    }

    if (userId && this.gameService.getRoomIdByUserId(userId)) {
      // Grace period instead of an instant forfeit — the opponent is notified and
      // the loop is paused until reconnection or until the 15s expire.
      this.gameService.handleDisconnect(userId, this.server);
    }
  }

  // ---- MATCHMAKING ----
  // The frontend asks to join the queue. If an opponent is waiting, start a match.
  @SubscribeMessage('joinQueue')
  handleJoinQueue(@ConnectedSocket() client: Socket) {
    console.log('JOIN QUEUE', client.id);
    console.log({
      socket: client.id,
      roomId: client.data.roomId,
      side: client.data.side,
      queue: this.queue.map((s) => s.id),
    });

    const liveRoomId = this.gameService.getRoomIdByUserId(
      client.data.user?.sub,
    );
    if (liveRoomId) {
      const players = this.gameService.getRoomPlayers(liveRoomId);
      if (players) {
        const side: Side =
          players.leftUserId === client.data.user?.sub ? 'left' : 'right';
        this.assignToRoom(client, liveRoomId, side);
        client.emit('rejoinedGame', {
          roomId: liveRoomId,
          side,
          opponentUsername: null,
        });
        return;
      }
    }
    client.data.roomId = undefined;
    client.data.side = undefined;

    // Avoid duplicates or joining the queue while already in a game.
    if (this.queue.some((s) => s.id === client.id)) {
      return;
    }

    let opponent: Socket | undefined;
    while ((opponent = this.queue.shift())) {
      const activeOpponent = this.server.sockets.sockets.get(opponent.id);
      if (activeOpponent && activeOpponent.connected) {
        opponent = activeOpponent;
        break;
      } // still connected, use it
      opponent = undefined; // stale entry, discard and keep looking
    }

    if (!opponent) {
      // Nobody here: queue up and notify.
      this.queue.push(client);
      client.emit('waiting');
      return;
    }

    // Pair them up: the one who was waiting is 'left', the new one is 'right'.
    const roomId = `game-${opponent.id}-${client.id}`;

    this.assignToRoom(opponent, roomId, 'left');
    this.assignToRoom(client, roomId, 'right');

    opponent.emit('matchFound', {
      roomId,
      side: 'left',
      opponent: {
        id: client.data.user?.sub,
        email: client.data.user?.email,
        username: client.data.user?.username,
      },
    });

    client.emit('matchFound', {
      roomId,
      side: 'right',
      opponent: {
        id: opponent.data.user?.sub,
        email: opponent.data.user?.email,
        username: opponent.data.user?.username,
      },
    });

    this.gameService.createGame(
      roomId,
      opponent.data.user.sub,
      client.data.user.sub,
      this.server,
    );
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.queue = this.queue.filter((s) => s.id !== client.id);
  }

  // ---- INPUT DE JUEGO ----
  // The player only controls their own paddle (based on the assigned 'side').
  @SubscribeMessage('paddleInput')
  handlePaddleInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dir: Dir },
  ) {
    const roomId: string | undefined = client.data.roomId;
    const side: Side | undefined = client.data.side;
    if (!roomId || !side || !data) return;

    this.gameService.setPlayerInput(roomId, side, data.dir);
  }

  private assignToRoom(client: Socket, roomId: string, side: Side) {
    console.log('ASSIGN', client.id, roomId, side);
    client.join(roomId);
    client.data.roomId = roomId;
    client.data.side = side;
  }

  // ---- TEST EVENT (debugging) ----
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const userEmail = client.data.user.email;
    console.log(`Ping received from ${userEmail} | Data:`, data);

    // Respond only to that client
    client.emit('pong', {
      message: `Hi ${userEmail}, WebSocket connection successful!`,
    });
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.sub;
    const roomId: string | undefined = client.data.roomId;
    if (!userId || !roomId) return;

    this.gameService.forfeitImmediately(userId, this.server);
    client.leave(roomId);
    client.data.roomId = undefined;
    client.data.side = undefined;
  }

  @SubscribeMessage('checkRoom')
  handleCheckRoom(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    const roomId = this.gameService.getRoomIdByUserId(userId);

    if (roomId) {
      const players = this.gameService.getRoomPlayers(roomId);

      if (players) {
        const side: Side = players.leftUserId === userId ? 'left' : 'right';

        const opponentUserId =
          side === 'left' ? players.rightUserId : players.leftUserId;

        const opponentSocketId = this.presence.getSocketId(opponentUserId);

        const opponentSocket = opponentSocketId
          ? this.server.sockets.sockets.get(opponentSocketId)
          : undefined;

        const opponentUsername = opponentSocket?.data.user?.username ?? null;

        this.assignToRoom(client, roomId, side);

        const bothHere =
          !!this.presence.getSocketId(players.leftUserId) &&
          !!this.presence.getSocketId(players.rightUserId);
        this.gameService.resumeIfReady(roomId, this.server, bothHere);

        client.emit('rejoinedGame', {
          roomId,
          side,
          opponentUsername,
        });

        return;
      }
    }

    client.emit('noActiveGame');
  }

  afterInit(server: Server) {
    this.presence.setServer(server);
  }

  //---INVITE PLAYER TO A ROOM---
  @SubscribeMessage('sendGameInvite')
  handleSendGameInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; senderUsername: string },
  ) {
    const senderId = client.data.user?.sub;
    if (!senderId || !data?.receiverId) return;
    if (senderId === data.receiverId) return; // can't invite yourself, but who knows
    if (this.gameService.getRoomIdByUserId(senderId)) {
      // am I busy?
      client.emit('gameInviteFailed', { reason: 'busy' });
      return;
    }
    if (this.gameService.getRoomIdByUserId(data.receiverId)) {
      // is my opponent busy?
      client.emit('gameInviteFailed', { reason: 'opponent-busy' });
      return;
    }
    let outgoing = 0;
    for (const inv of this.pendingInvites.values()) {
      if (inv.receiverId === data.receiverId) {
        client.emit('gameInviteFailed', { reason: 'opponent-pending' });
        return;
      }
      if (inv.senderId === senderId) outgoing++;
    }
    if (outgoing >= this.MAX_OUTGOING_INVITES) {
      client.emit('gameInviteFailed', { reason: 'too-many-invites' });
      return;
    }
    const inviteId = randomUUID();
    const gameRoomId = `invite-${inviteId}`;

    const timeout = setTimeout(() => {
      this.pendingInvites.delete(inviteId);
      client.emit('gameInviteExpired', { inviteId });
      const receiverSocketId = this.presence.getSocketId(data.receiverId);
      if (receiverSocketId)
        this.server
          .to(receiverSocketId)
          .emit('gameInviteExpired', { inviteId });
    }, 15000);

    this.pendingInvites.set(inviteId, {
      inviteId,
      senderId,
      senderUsername: data.senderUsername,
      receiverId: data.receiverId,
      gameRoomId,
      timeout,
    });

    const delivered = this.presence.emitToUser(
      data.receiverId,
      'gameInviteReceived',
      {
        inviteId,
        senderId,
        senderUsername: data.senderUsername,
        gameRoomId,
      },
    );
    if (!delivered) {
      clearTimeout(timeout);
      this.pendingInvites.delete(inviteId);
      client.emit('gameInviteFailed', { reason: 'offline' });
      return;
    }
    client.emit('gameInviteSent', { inviteId, gameRoomId });
  }

  @SubscribeMessage('acceptGameInvite')
  handleAcceptGameInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviteId: string },
  ) {
    const invite = this.pendingInvites.get(data.inviteId);
    if (!invite) {
      client.emit('gameInviteExpired', { inviteId: data.inviteId });
      return;
    }

    const receiverId = client.data.user?.sub;
    if (receiverId !== invite.receiverId) return; // not this user's invite to accept
    // The sender may have been pulled into another game, so don't build a new room
    // if sender is already playing (can't join the new one).
    if (this.gameService.getRoomIdByUserId(invite.senderId)) {
      clearTimeout(invite.timeout);
      this.pendingInvites.delete(data.inviteId);
      client.emit('gameInviteExpired', { inviteId: data.inviteId });
      return;
    }
    clearTimeout(invite.timeout);
    this.pendingInvites.delete(data.inviteId);

    // Remove every other pending invite for both players so they cannot second-accept
    this.cancelInvitesForUsers([invite.senderId, receiverId]);

    // Pull both out of matchmaking
    this.queue = this.queue.filter(
      (s) => s.id !== client.id && s.data.user?.sub !== invite.senderId,
    );

    // Receiver might have joined a game so we also remove it.
    this.forfeitExistingGameIfAny(receiverId, client);

    this.gameService.createGame(
      invite.gameRoomId,
      invite.senderId,
      receiverId,
      this.server,
    );

    // Both sides just get told "go to the game" — the game page's own
    // checkRoom flow handles the actual socket join/side assignment,
    // same as it does on a hard refresh.
    client.emit('gameInviteAccepted', { roomId: invite.gameRoomId });
    const senderSocketId = this.presence.getSocketId(invite.senderId);
    if (senderSocketId) {
      this.server
        .to(senderSocketId)
        .emit('gameInviteAccepted', { roomId: invite.gameRoomId });
    }
  }

  private cancelInvitesForUsers(userIds: string[]) {
    const involved = new Set(userIds);
    for (const [id, inv] of this.pendingInvites) {
      if (!involved.has(inv.senderId) && !involved.has(inv.receiverId))
        continue;
      clearTimeout(inv.timeout);
      this.pendingInvites.delete(id);
      for (const uid of [inv.senderId, inv.receiverId]) {
        const sid = this.presence.getSocketId(uid);
        if (sid)
          this.server
            .to(sid)
            .emit('gameInviteExpired', { inviteId: id, reason: 'superseded' });
      }
    }
  }

  private forfeitExistingGameIfAny(userId: string, socket: Socket) {
    const existingRoomId = this.gameService.getRoomIdByUserId(userId);
    if (!existingRoomId) return;

    this.gameService.forfeitImmediately(userId, this.server);
    socket.leave(existingRoomId);
    socket.data.roomId = undefined;
    socket.data.side = undefined;
  }

  @SubscribeMessage('declineGameInvite')
  handleDeclineGameInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviteId: string },
  ) {
    const invite = this.pendingInvites.get(data.inviteId);
    if (!invite) return; // already expired/handled, nothing to do

    const receiverId = client.data.user?.sub;
    if (receiverId !== invite.receiverId) return;

    clearTimeout(invite.timeout);
    this.pendingInvites.delete(data.inviteId);

    const senderSocketId = this.presence.getSocketId(invite.senderId);
    if (senderSocketId) {
      this.server
        .to(senderSocketId)
        .emit('gameInviteDeclined', { inviteId: data.inviteId });
    }
  }

  //---CHAT---
  @SubscribeMessage('getChatHistory')
  handleGetChatHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    const userId = client.data.user?.sub;
    if (!userId || !data?.friendId) return;
    const key = this.chatKey(userId, data.friendId);
    client.emit('chatHistory', {
      friendId: data.friendId,
      messages: this.chatHistory.get(key) ?? [],
    });
  }

  @SubscribeMessage('sendChatMessage')
  handleSendChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; text: string },
  ) {
    const senderId = client.data.user?.sub;
    const text = data?.text?.trim();
    if (!senderId || !data?.receiverId || !text || text.length > 1000) return;

    const message = {
      id: randomUUID(),
      senderId,
      senderUsername: client.data.user?.username ?? null,
      receiverId: data.receiverId,
      text,
      timestamp: Date.now(),
    };

    const key = this.chatKey(senderId, data.receiverId);
    const history = this.chatHistory.get(key) ?? [];
    history.push(message);
    if (history.length > this.MAX_HISTORY_PER_CONVO) history.shift();
    this.chatHistory.set(key, history);

    client.emit('chatMessageReceived', message);
    const receiverSocketId = this.presence.getSocketId(data.receiverId);
    if (receiverSocketId)
      this.server.to(receiverSocketId).emit('chatMessageReceived', message);
  }
}
