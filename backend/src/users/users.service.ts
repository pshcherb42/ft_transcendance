import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from "../generated/prisma/client";
import * as bcrypt from 'bcrypt';

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

  async create(data: { email: string; username: string; password: string }): Promise<User> {
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingUsername = await this.findByUsername(data.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await bcrypt.hash(data.password, 12);
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
      data: { avatar: avatarPath },
    });
  }

  async updateProfile(userId: string, data: { username?: string }): Promise<User> {
    if (data.username) {
      const existing = await this.findByUsername(data.username);
      if (existing && existing.id !== userId)
        throw new ConflictException('Username already taken');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  // Returns user WITHOUT sensitive fields
  sanitize(user: User) {
    const { password, refreshToken, ...safe } = user;
    return safe;
  }
}
