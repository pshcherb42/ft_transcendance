import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

import { WebsocketsModule } from './websockets/websockets.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, WebsocketsModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
