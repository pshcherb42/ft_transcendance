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
  
  // Habilitamos CORS igual que en HTTP para que el frontend pueda conectarse
  @WebSocketGateway({
	cors: {
	  origin: 'http://localhost:3000',
	  credentials: true,
	},
  })
  export class WebsocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;
  
	constructor(
	  private jwtService: JwtService,
	  private configService: ConfigService,
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
	}
  
	// ---- UN EVENTO DE PRUEBA ----
	// El frontend enviará un mensaje "ping" y nosotros responderemos
	@SubscribeMessage('ping')
	handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
	  const userEmail = client.data.user.email;
	  console.log(`Ping received from ${userEmail} | Data:`, data);
	  
	  // Respondemos solo a ese cliente
	  client.emit('pong', { message: `Hola ${userEmail}, conexión WebSocket exitosa!` });
	}
  }