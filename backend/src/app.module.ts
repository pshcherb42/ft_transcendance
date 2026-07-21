import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { PublicApiModule } from './public-api/public-api.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, WebsocketsModule, PublicApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// added api module
