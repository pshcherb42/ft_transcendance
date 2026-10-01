import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WebsocketsGateway } from './websockets.gateway';
import { GameService } from './game.service';
import { MatchService } from './match.service';
import { PresenceModule } from '../presence/presence.module';
import { FriendsModule } from '../friends/friends.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    PresenceModule,
    FriendsModule,
    UsersModule,
  ],
  providers: [WebsocketsGateway, GameService, MatchService],
})
export class WebsocketsModule {}
