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
  export class WebsocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	// Cola de matchmaking: sockets esperando rival.
	private queue: Socket[] = [];

	constructor(
	  private jwtService: JwtService,
	  private configService: ConfigService,
	  private gameService: GameService,
	) {}

	// Este método salta automáticamente cuando un cliente intenta conectarse
	async handleConnection(client: Socket) {
		try {
		  const token = client.handshake.auth.token;
		  if (!token) throw new Error('No token provided');
	  
		  const payload = await this.jwtService.verifyAsync(token, {
			secret: this.configService.get<string>('JWT_SECRET'),
		  });
	  
		  client.data.user = payload;
		  console.log(`Client connected: ${client.id} | User ID: ${payload.sub}`);
	  
		  // Reconexión: si este usuario tenía una sala activa en periodo de gracia,
		  // la retoma antes de que expiren los 15s.
		  const roomId = this.gameService.handleReconnect(payload.sub, this.server);
		  if (roomId) {
			const players = this.gameService.getRoomPlayers(roomId);
			if (players) {
			  const side: Side = players.leftUserId === payload.sub ? 'left' : 'right';
			  this.assignToRoom(client, roomId, side);
			  client.emit('rejoinedGame', { roomId, side });
			}
		  }
		} catch (error) {
		  console.log(`Connection rejected: ${client.id} | Error: ${error.message}`);
		  client.disconnect();
		}
	}

	// Este método salta cuando un cliente cierra la pestaña o pierde internet
	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	  
		this.queue = this.queue.filter((s) => s.id !== client.id);
	  
		const userId: string | undefined = client.data.user?.sub;
		const roomId: string | undefined = client.data.roomId;
	  
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
  }
