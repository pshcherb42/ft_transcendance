import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WebsocketsGateway } from './websockets.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule, // Importamos esto para poder usar el JwtService en nuestro Gateway
  ],
  providers: [WebsocketsGateway],
})
export class WebsocketsModule {}