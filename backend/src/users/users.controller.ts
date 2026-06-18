import { Controller, Get, Put, Param, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /users/me — get current user's profile
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.usersService.sanitize(user);
  }

  // GET /users/:id — get any user's profile
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersService.sanitize(user);
  }

  // PUT /users/me — update current user's profile
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Request() req, @Body() body: { username?: string }) {
    const updated = await this.usersService.updateProfile(req.user.id, body);
    return this.usersService.sanitize(updated);
  }
}
