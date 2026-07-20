import {
  Controller, Post, Get, Body, UseGuards,
  Request, HttpCode, HttpStatus, Redirect,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/register
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.username, body.password);
  }

  // POST /auth/login
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // POST /auth/refresh
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req) {
    return this.authService.refreshTokens(req.user.id, req.user.email);
  }

  // POST /auth/logout
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    await this.authService.logout(req.user.id);
    return { message: 'Logged out' };
  }

  // GET /auth/google — redirect to Google consent screen
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  // GET /auth/google/callback — Google redirects here after consent
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  googleCallback(@Request() req) {
    const { accessToken, refreshToken } = req.user;
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:8080';
    return {
      url: `${frontend}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    };
  }
}
