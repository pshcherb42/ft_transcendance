// friends/friends.module.ts
import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { PresenceModule } from '../presence/presence.module';
import { PrismaModule } from '../prisma/prisma.module'; // adjust if named differently

@Module({
  imports: [PrismaModule, PresenceModule],
  providers: [FriendsService],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}