import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect();
      return false;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      // Attach user to socket for later use in gateway handlers
      client.data.userId = payload.sub;
      client.data.username = payload.username;
      return true;
    } catch (err) {
      this.logger.warn(`WS auth failed: ${err.message}`);
      client.disconnect();
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    // Frontend sends token in handshake auth, not headers (browsers can't set
    // custom headers on the socket.io websocket upgrade reliably)
    const token = client.handshake.auth?.token;
    return token || null;
  }
}