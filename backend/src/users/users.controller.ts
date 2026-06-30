import {
  Controller, Get, Put, Post, Param, Body,
  UseGuards, Request, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.usersService.sanitize(user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    const updated = await this.usersService.updateProfile(req.user.id, dto);
    return this.usersService.sanitize(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  async uploadAvatar(@Request() req, @Body() body: { avatar: string }) {
    if (!body?.avatar || !body.avatar.startsWith('data:image/')) {
      throw new BadRequestException('Invalid image data');
    }
    if (body.avatar.length > 1_100_000) {
      throw new BadRequestException('Image too large');
    }
    const updated = await this.usersService.updateAvatar(req.user.id, body.avatar);
    return this.usersService.sanitize(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersService.sanitize(user);
  }
}
