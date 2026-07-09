import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WebsocketsGateway } from './websockets.gateway';
import { GameService } from './game.service';
import { MatchService } from './match.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
  ],
  providers: [WebsocketsGateway, GameService, MatchService],
})
export class WebsocketsModule {}