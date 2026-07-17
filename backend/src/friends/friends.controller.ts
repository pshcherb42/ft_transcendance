// friends/friends.controller.ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // adjust to your actual guard name/path
import { FriendsService } from './friends.service';
import { RespondRequestDto } from './dto/respond-request.dto';

@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Post('request/:username')
  sendRequest(@Req() req, @Param('username') username: string) {
    return this.friendsService.sendRequest(req.user.sub, username);
  }

  @Post('respond/:friendshipId')
  respond(@Req() req, @Param('friendshipId') friendshipId: string, @Body() dto: RespondRequestDto) {
    return this.friendsService.respondToRequest(req.user.sub, friendshipId, dto.action);
  }

  @Delete(':friendshipId')
  remove(@Req() req, @Param('friendshipId') friendshipId: string) {
    return this.friendsService.removeFriend(req.user.sub, friendshipId);
  }

  @Post('block/:username')
  block(@Req() req, @Param('username') username: string) {
    return this.friendsService.blockUser(req.user.sub, username);
  }

  @Get()
  list(@Req() req) {
    return this.friendsService.listFriends(req.user.sub);
  }

  @Get('pending/incoming')
  incoming(@Req() req) {
    return this.friendsService.listPendingIncoming(req.user.sub);
  }

  @Get('pending/outgoing')
  outgoing(@Req() req) {
    return this.friendsService.listPendingOutgoing(req.user.sub);
  }
}