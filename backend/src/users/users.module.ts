import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FriendsModule } from '../friends/friends.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [FriendsModule, PresenceModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
