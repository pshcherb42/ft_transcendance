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
      data: { avatar: avatarPath },
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

  sanitize(user: User) {
    const { password, refreshToken, ...safe } = user;
    return safe;
  }
}
