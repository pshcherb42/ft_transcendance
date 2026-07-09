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
	  origin: ['http://localhost:8080', 'http://localhost:3000'],
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
		// 1. Extraemos el token que el frontend enviará al conectarse
		const token = client.handshake.auth.token;

		if (!token) {
		  throw new Error('No token provided');
		}

		// 2. Verificamos que el token sea válido usando la clave secreta de tus compañeros
		const payload = await this.jwtService.verifyAsync(token, {
		  secret: this.configService.get<string>('JWT_SECRET'),
		});

		// 3. Si es válido, guardamos la info del usuario en el socket para usarla luego
		client.data.user = payload;
		console.log(`Client connected: ${client.id} | User ID: ${payload.sub}`);

	  } catch (error) {
		// Si el token es falso, ha caducado, o no hay, lo echamos
		console.log(`Connection rejected: ${client.id} | Error: ${error.message}`);
		client.disconnect();
	  }
	}

	// Este método salta cuando un cliente cierra la pestaña o pierde internet
	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);

		// 1. Si estaba esperando en la cola, lo quitamos.
		this.queue = this.queue.filter((s) => s.id !== client.id);

		// 2. Si estaba jugando, terminamos la partida y avisamos al rival.
		const roomId: string | undefined = client.data.roomId;
		if (roomId) {
			this.gameService.removeGame(roomId);
			client.to(roomId).emit('opponentLeft');
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

	  const opponent = this.queue.shift();

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

	  // Pasamos los userId (del JWT) para poder persistir el resultado al terminar.
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
