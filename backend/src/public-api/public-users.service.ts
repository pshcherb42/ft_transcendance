import {
    Injectable,
    NotFoundException,
    ConflictException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { CreatePublicUserDto } from './dto/create-public-user.dto';
  import { UpdatePublicUserDto } from './dto/update-public-user.dto';
  import { PublicUserResponseDto } from './dto/public-user-response.dto';
  
  const PUBLIC_SELECT = {
    id: true,
    username: true,
    name: true,
    avatar: true,
    createdAt: true,
  };
  
  @Injectable()
  export class PublicUsersService {
    constructor(private prisma: PrismaService) {}
  
    async findAll(page = 1, limit = 20): Promise<PublicUserResponseDto[]> {
      const users = await this.prisma.user.findMany({
        select: PUBLIC_SELECT,
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => new PublicUserResponseDto(u));
    }
  
    async findOne(id: string): Promise<PublicUserResponseDto> {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: PUBLIC_SELECT,
      });
      if (!user) throw new NotFoundException(`User ${id} not found`);
      return new PublicUserResponseDto(user);
    }
  
    async create(dto: CreatePublicUserDto): Promise<PublicUserResponseDto> {
      try {
        const user = await this.prisma.user.create({
          data: {
            email: dto.email,
            username: dto.username,
            name: dto.name,
            avatar: dto.avatar,
            // password intentionally omitted — public API never sets credentials
          },
          select: PUBLIC_SELECT,
        });
        return new PublicUserResponseDto(user);
      } catch (err: any) {
        if (err.code === 'P2002') {
          throw new ConflictException('Email or username already in use');
        }
        throw err;
      }
    }
  
    async update(id: string, dto: UpdatePublicUserDto): Promise<PublicUserResponseDto> {
      await this.findOne(id); // 404 if missing
      const user = await this.prisma.user.update({
        where: { id },
        data: dto,
        select: PUBLIC_SELECT,
      });
      return new PublicUserResponseDto(user);
    }
  
    async remove(id: string): Promise<{ id: string; deleted: true }> {
      await this.findOne(id); // 404 if missing
      try {
        await this.prisma.user.delete({ where: { id } });
        return { id, deleted: true };
      } catch (err: any) {
        if (err.code === 'P2003') {
          throw new ConflictException(
            'Cannot delete user: related matches, stats, or friends exist',
          );
        }
        throw err;
      }
    }
  }

  // methonds which retrieve info from schema 
  // still email here, maybe its for creation?