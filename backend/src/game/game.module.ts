import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameGateway } from './game.gateway';
import { GameRoomService } from './game-room.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
    }),
  ],
  providers: [GameGateway, GameRoomService],
})
export class GameModule {}