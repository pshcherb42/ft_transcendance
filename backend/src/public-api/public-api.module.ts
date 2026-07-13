import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module'; // adjust to your actual path
import { PublicUsersController } from './public-users.controller';
import { PublicUsersService } from './public-users.service';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 100 }, // fallback; controller overrides with @Throttle
    ]),
  ],
  controllers: [PublicUsersController],
  providers: [PublicUsersService],
})
export class PublicApiModule {}

// rate limiter