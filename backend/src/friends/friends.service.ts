// friends/friends.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../presence/presence.service';
import { Server } from 'socket.io';
import { FriendshipStatus } from '../generated/prisma/client';

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private presence: PresenceService,
  ) {}

  async sendRequest(senderId: string, receiverUsername: string) {
    const receiver = await this.prisma.user.findUnique({ where: { username: receiverUsername } });
    if (!receiver) throw new NotFoundException('User not found');
    if (receiver.id === senderId) throw new BadRequestException("Can't friend yourself");

    // Check both directions — A->B and B->A both count as "already related".
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });
    if (existing) {
      if (existing.status === 'BLOCKED') throw new ForbiddenException('Cannot send request');
      throw new BadRequestException('Friendship already exists or is pending');
    }

    const friendship = await this.prisma.friendship.create({
      data: { senderId, receiverId: receiver.id, status: 'PENDING' },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    });


    this.presence.emitToUser(receiver.id, 'friendRequestReceived', {
      id: friendship.id,
      sender: friendship.sender,
      createdAt: friendship.createdAt,
      message: `${friendship.sender.username} sent you a friend request`,
    });

    return friendship;

  }

  async respondToRequest(userId: string, friendshipId: string, action: 'accept' | 'decline') {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) throw new NotFoundException('Request not found');
    if (friendship.receiverId !== userId) throw new ForbiddenException('Not your request to respond to');
    if (friendship.status !== 'PENDING') throw new BadRequestException('Request already resolved');

    if (action === 'decline') {
      await this.prisma.friendship.delete({ where: { id: friendshipId } });
      this.presence.emitToUser(friendship.senderId, 'friendRequestDeclined', { friendshipId });
      return { status: 'declined' };
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    // ADD THIS — tell the original sender their request was accepted,
    // include the receiver's info since that's the "friend" from sender's POV
    this.presence.emitToUser(friendship.senderId, 'friendRequestAccepted', {
      friendshipId: updated.id,
      friend: { ...updated.receiver, online: this.presence.isOnline(updated.receiver.id) },
      message: `${updated.receiver.username} accepted your friend request`,
    });

    return updated;
  }

  async removeFriend(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) throw new NotFoundException('Friendship not found');
    if (friendship.senderId !== userId && friendship.receiverId !== userId) {
      throw new ForbiddenException('Not your friendship');
    }
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
    const otherUserId = friendship.senderId === userId ? friendship.receiverId : friendship.senderId;
    this.presence.emitToUser(otherUserId, 'friendRemoved', { 
      friendshipId,
      message: 'A friend has removed you from their list'
    });

    return { status: 'removed' };
  }

  async blockUser(userId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: target.id },
          { senderId: target.id, receiverId: userId },
        ],
      },
    });

    if (existing) {
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'BLOCKED', senderId: userId, receiverId: target.id },
      });
    }
    return this.prisma.friendship.create({
      data: { senderId: userId, receiverId: target.id, status: 'BLOCKED' },
    });
  }

  // Accepted friends, annotated with live online status from PresenceService.
  async listFriends(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    return rows.map((f) => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      return {
        friendshipId: f.id,
        ...friend,
        online: this.presence.isOnline(friend.id),
      };
    });
  }

  async listPendingIncoming(userId: string) {
    return this.prisma.friendship.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    });
  }

  async listPendingOutgoing(userId: string) {
    return this.prisma.friendship.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: { receiver: { select: { id: true, username: true, avatar: true } } },
    });
  }

  // Called by the gateway on connect/disconnect to push presence updates
  // only to this user's accepted friends (not a global broadcast).
  async notifyFriendsOfPresence(userId: string, online: boolean, server: Server, presence: PresenceService) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
  
    const rows = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
      select: { senderId: true, receiverId: true },
    });
  
    const friendIds = rows.map((f) => (f.senderId === userId ? f.receiverId : f.senderId));
    const event = online ? 'friendOnline' : 'friendOffline';
  
    for (const friendId of friendIds) {
      const socketId = presence.getSocketId(friendId);
      if (socketId) server.to(socketId).emit(event, { userId, username: user?.username });
    }
  }
}