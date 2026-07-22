import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(data: {
    email: string;
    username: string;
    password: string | null;
  }): Promise<User> {
  
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail)
      throw new ConflictException('Email already in use');
  
    const existingUsername = await this.findByUsername(data.username);
    if (existingUsername)
      throw new ConflictException('Username already taken');
  
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 12)
      : null;
  
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
      },
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hashed = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  async updateAvatar(userId: string, avatarPath: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },  // now stores base64 string
    });
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const updateData: Partial<{ username: string; password: string }> = {};

    if (dto.username) {
      const existing = await this.findByUsername(dto.username);
      if (existing && existing.id !== userId)
        throw new ConflictException('Username already taken');
      updateData.username = dto.username;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword)
        throw new BadRequestException('Current password is required to set a new password');

      if (!user.password)
        throw new BadRequestException('Cannot change password for OAuth accounts');

      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid)
        throw new UnauthorizedException('Current password is incorrect');

      updateData.password = await bcrypt.hash(dto.newPassword, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async getStats(userId: string) {
    const [stats, matches] = await Promise.all([
      this.prisma.stats.findUnique({ where: { userId } }),
      this.prisma.match.findMany({
        where: { OR: [{ homeId: userId }, { awayId: userId }] },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          homePlayer: { select: { username: true } },
          awayPlayer: { select: { username: true } },
        },
      }),
    ]);

    const wins = stats?.wins ?? 0;
    const losses = stats?.losses ?? 0;
    const totalMatches = wins + losses;

    const history = matches.map((match) => {
      const isHome = match.homeId === userId;
      const opponent = isHome ? match.awayPlayer : match.homePlayer;
      return {
        id: match.id,
        opponent: match.isAIGame && !opponent ? 'CPU' : (opponent?.username ?? 'Unknown'),
        myScore: isHome ? match.homeScore : match.awayScore,
        opponentScore: isHome ? match.awayScore : match.homeScore,
        won: match.winnerId === userId,
        createdAt: match.createdAt,
      };
    });

    return {
      wins,
      losses,
      level: stats?.level ?? 1,
      totalMatches,
      winRate: totalMatches ? wins / totalMatches : 0,
      matches: history,
    };
  }

  async getLeaderboard(userIds?: string[]) {
    const stats = await this.prisma.stats.findMany({
      where: userIds ? { userId: { in: userIds } } : undefined,
      include: { user: { select: { username: true, avatar: true } } },
    });

    return stats
      .map((s) => {
        const totalMatches = s.wins + s.losses;
        return {
          userId: s.userId,
          username: s.user.username,
          avatarPath: s.user.avatar ?? this.defaultAvatar(s.user.username),
          wins: s.wins,
          losses: s.losses,
          totalMatches,
          winRate: totalMatches ? s.wins / totalMatches : 0,
          level: s.level,
        };
      })
      .filter((row) => row.totalMatches > 0)
      .sort((a, b) => b.winRate - a.winRate || b.totalMatches - a.totalMatches)
      .map((row, i) => ({ rank: i + 1, ...row }));
  }

  sanitize(user: User) {
    const { password, refreshToken, avatar, ...rest } = user;
    return {
      ...rest,
      avatarPath:  avatar ?? this.defaultAvatar(user.username),   // now a base64 data URL or null
      hasPassword: password !== null,
    };
  }

  private defaultAvatar(username: string): string {
    return `https://api.dicebear.com/9.x/pixel-art/png?seed=${encodeURIComponent(username)}`;
  }

}
