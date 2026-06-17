import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) 
  {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) 
  {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: { userId: string; refreshToken: string }) 
  {
    return this.authService.refresh(refreshDto.userId, refreshDto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() logoutDto: { userId: string }) 
  {
    return this.authService.logout(logoutDto.userId);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any) {
    return this.authService.oauthLogin(req.user);
  }

  @Get('42')
  @UseGuards(AuthGuard('42'))
  fortyTwoLogin() {}

  @Get('42/callback')
  @UseGuards(AuthGuard('42'))
  async fortyTwoCallback(@Req() req: any) {
    return this.authService.oauthLogin(req.user);
  }
}
