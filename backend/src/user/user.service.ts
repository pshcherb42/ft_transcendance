import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService 
{
  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string) 
  {
    return this.prisma.user.findUnique
    ({
      where: { id },
      select: { id: true, username: true, email: true, avatarUrl: true },
    });
  }
  async updateMe(userId: string, updateUserDto: UpdateUserDto) 
  {
    const checks: any[] = [];
    if (updateUserDto.email) {
      checks.push({ email: updateUserDto.email });
    }
    if (updateUserDto.username) {
      checks.push({ username: updateUserDto.username });
    }

    if (checks.length) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: checks,
          NOT: { id: userId },
        },
      });
      if (existingUser) {
        throw new ConflictException('El correu o nom d’usuari ja està en ús');
      }
    }

    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update
    ({
      where: { id: userId },
      data,
      select: { id: true, username: true, email: true, avatarUrl: true},
    });
  }
  async updateAvatar(userId: string, file: Express.Multer.File) 
  {
    const avatarUrl = `/uploads/${file.filename}`;
    return this.prisma.user.update
    ({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, username: true, email: true, avatarUrl: true,},
    });
  }
}