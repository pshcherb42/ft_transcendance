import {
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	ConnectedSocket,
	MessageBody
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

  // Habilitamos CORS igual que en HTTP para que el frontend pueda conectarse.
  // 8080 = acceso vía nginx (mismo origen que la app); 3000 = frontend directo en dev.
  @WebSocketGateway({
	cors: {
	  origin: (origin, callback) => {
		// 1. Allow if origin is missing or coming from internal Docker networks
		if (!origin || origin.includes('frontend') || origin.includes('backend')) {
		  return callback(null, true);
		}
  
		// 2. Comprehensive validation rule checks
		const allowed =
		  /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
		  /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
		  /^https?:\/\/[a-zA-Z0-9_-]+(:\d+)?$/.test(origin) || // Matches raw hostname mappings
		  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
		  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
  
		if (allowed) {
		  callback(null, true);
		} else {
		  console.warn(`⚠️ WebSocket connection blocked by CORS from origin: ${origin}`);
		  callback(new Error('Not allowed by CORS'), false);
		}
	  },
	  credentials: true,
	},
  })
  export class WebsocketsGateway implements OnGatewayConnection, OnGatewayDisconnect , OnGatewayInit {
	@WebSocketServer()
	server: Server;

	// Cola de matchmaking: sockets esperando rival.
	private queue: Socket[] = [];
	private userSockets = new Map<string, string>(); // userId -> current socketId
  	private kickedSockets = new Set<string>(); // sockets we deliberately disconnected

	private pendingInvites = new Map<string, {
		inviteId: string;
		senderId: string;
		senderUsername: string;
		receiverId: string;
		gameRoomId: string;
		timeout: NodeJS.Timeout;
	}>();

	constructor(
	  private jwtService: JwtService,
	  private configService: ConfigService,
	  private gameService: GameService,
	  private presence: PresenceService,
	  private friendsService: FriendsService
	) {}

	// Este método salta automáticamente cuando un cliente intenta conectarse
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
				const existingSocket = this.server.sockets.sockets.get(existingSocketId);
				if (existingSocket) {
				console.log(`Kicking previous session ${existingSocketId} for user ${userId}`);
				// Flag it BEFORE disconnecting, so handleDisconnect knows to skip
				// all game/reconnect logic for this socket entirely.
				this.kickedSockets.add(existingSocketId);
				existingSocket.emit('forceDisconnect', {
					reason: 'Logged in from another location',
				});
				existingSocket.disconnect(true);
				}
			}
			this.presence.setOnline(userId, client.id, () => {
				void this.friendsService.notifyFriendsOfPresence(userId, true, this.server, this.presence);
			});
			// --- end single-session enforcement ---

			// Room takeover: if the user has a live room, rejoin instantly.
			// This is a direct lookup, NOT handleReconnect — no grace-period
			// state was ever touched, so there's nothing to "reconnect" from.
			
			// Genuine drop-and-reconnect path (different scenario entirely —
			// real network loss, grace timer already running).
			this.gameService.handleReconnect(userId, this.server);
		} catch (error) {
			console.log(`Connection rejected: ${client.id} | Error: ${error.message}`);
			client.disconnect();
		}
	}

	// Este método salta cuando un cliente cierra la pestaña o pierde internet
	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
		console.log(
			"DISCONNECT",
			client.id,
			client.data.roomId
		);
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
			  void this.friendsService.notifyFriendsOfPresence(userId, false, this.server, this.presence);
			});
		}

		if (roomId && userId) {
		  // Periodo de gracia en vez de forfeit instantáneo — se avisa al rival y
		  // se pausa el bucle hasta reconexión o hasta que expiren los 15s.
		  this.gameService.handleDisconnect(userId, this.server);
		}
	}

	// ---- MATCHMAKING ----
	// El frontend pide entrar en la cola. Si hay rival esperando, empezamos partida.
	@SubscribeMessage('joinQueue')
	handleJoinQueue(@ConnectedSocket() client: Socket) {
		console.log("JOIN QUEUE", client.id);
		console.log({
			socket: client.id,
			roomId: client.data.roomId,
			side: client.data.side,
			queue: this.queue.map(s => s.id),
		});
		// Evitar duplicados o entrar en cola mientras ya se juega.
		if (client.data.roomId || this.queue.some((s) => s.id === client.id)) {
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
			// No hay nadie: encolamos y avisamos.
			this.queue.push(client);
			client.emit('waiting');
			return;
		}

		// Emparejamos: el que esperaba es 'left', el nuevo es 'right'.
		const roomId = `game-${opponent.id}-${client.id}`;

		this.assignToRoom(opponent, roomId, 'left');
		this.assignToRoom(client, roomId, 'right');

		opponent.emit('matchFound', {
			roomId,
			side: 'left',
			opponent: { id: client.data.user?.sub, email: client.data.user?.email },
		});
		client.emit('matchFound', {
			roomId,
			side: 'right',
			opponent: { id: opponent.data.user?.sub, email: opponent.data.user?.email },
		});

		this.gameService.createGame(roomId, opponent.data.user.sub, client.data.user.sub, this.server);
	}

	@SubscribeMessage('leaveQueue')
	handleLeaveQueue(@ConnectedSocket() client: Socket) {
	  this.queue = this.queue.filter((s) => s.id !== client.id);
	}

	// ---- INPUT DE JUEGO ----
	// El jugador solo controla su propia pala (según el 'side' asignado).
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
		console.log(
			"ASSIGN",
			client.id,
			roomId,
			side
		);
		client.join(roomId);
		client.data.roomId = roomId;
		client.data.side = side;
	}

	// ---- EVENTO DE PRUEBA (depuración) ----
	@SubscribeMessage('ping')
	handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
	  const userEmail = client.data.user.email;
	  console.log(`Ping received from ${userEmail} | Data:`, data);

	  // Respondemos solo a ese cliente
	  client.emit('pong', { message: `Hola ${userEmail}, conexión WebSocket exitosa!` });
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
				this.assignToRoom(client, roomId, side);
				client.emit('rejoinedGame', { roomId, side });
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

	const inviteId = randomUUID();
	const gameRoomId = `invite-${inviteId}`;

	const timeout = setTimeout(() => {
		this.pendingInvites.delete(inviteId);
		client.emit('gameInviteExpired', { inviteId });
		const receiverSocketId = this.presence.getSocketId(data.receiverId);
		if (receiverSocketId) this.server.to(receiverSocketId).emit('gameInviteExpired', { inviteId });
	}, 15000);

	this.pendingInvites.set(inviteId, {
		inviteId,
		senderId,
		senderUsername: data.senderUsername,
		receiverId: data.receiverId,
		gameRoomId,
		timeout,
	});

	this.presence.emitToUser(data.receiverId, 'gameInviteReceived', {
		inviteId,
		senderId,
		senderUsername: data.senderUsername,
		gameRoomId,
	});

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

		clearTimeout(invite.timeout);
		this.pendingInvites.delete(data.inviteId);

		// Both players are entering a game now — pull them out of matchmaking
		// so a stale queue entry can't pair them into a second, orphaned match.
		this.queue = this.queue.filter(
			(s) => s.id !== client.id && s.data.user?.sub !== invite.senderId,
		);

		// Only the receiver can possibly be mid-game — the friends-page invite
		// button is unreachable without having already left any active match.
		this.forfeitExistingGameIfAny(receiverId, client);

		this.gameService.createGame(invite.gameRoomId, invite.senderId, receiverId, this.server);

		// Both sides just get told "go to the game" — the game page's own
		// checkRoom flow handles the actual socket join/side assignment,
		// same as it does on a hard refresh.
		client.emit('gameInviteAccepted', { roomId: invite.gameRoomId });
		const senderSocketId = this.presence.getSocketId(invite.senderId);
		if (senderSocketId) {
			this.server.to(senderSocketId).emit('gameInviteAccepted', { roomId: invite.gameRoomId });
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
		this.server.to(senderSocketId).emit('gameInviteDeclined', { inviteId: data.inviteId });
	}
	}

  }
