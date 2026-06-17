import { Controller, Get, Param, Put, Body, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@Controller('users')
export class UserController 
{
  constructor(private readonly userService: UserService) {}
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) 
  {
    return this.userService.findById(req.user.id);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) 
  {
    return this.userService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  updateMe(@Req() req: any, @Body() body: any) 
  {
    return this.userService.updateMe(req.user.id, body);
  }
  
  @UseGuards(JwtAuthGuard)
  @Put('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', { dest: './uploads', limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Només es permeten arxius d\'imatge'), false);
      }
      cb(null, true);
    } }),
  )
  uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.userService.updateAvatar(req.user.id, file);
  }
} 