import {
  Controller, Get, Put, Post, Param, Body,
  UseGuards, Request, NotFoundException,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /users/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.usersService.sanitize(user);
  }

  // GET /users/:id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersService.sanitize(user);
  }

  // PUT /users/me
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Request() req, @Body() body: { username?: string }) {
    const updated = await this.usersService.updateProfile(req.user.id, body);
    return this.usersService.sanitize(updated);
  }

  // POST /users/me/avatar
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const avatarPath = `/uploads/avatars/${file.filename}`;
    const updated = await this.usersService.updateAvatar(req.user.id, avatarPath);
    return this.usersService.sanitize(updated);
  }
}
