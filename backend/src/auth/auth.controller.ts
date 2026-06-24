import {
    Controller, Post, Get, Body, UseGuards, Redirect,
    Request, HttpCode, HttpStatus,
  } from '@nestjs/common';
  import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
  import { LocalAuthGuard } from './guards/local-auth.guard';
  import { JwtAuthGuard } from './guards/jwt-auth.guard';
  import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
  
  @Controller('auth')
  export class AuthController {
    constructor(private authService: AuthService) {}
  
    // POST /auth/register
    @Post('register')
    async register(@Body() body: { email: string; username: string; password: string }) {
      return this.authService.register(body.email, body.username, body.password);
    }
  
    // POST /auth/login  (LocalStrategy validates email+password first)
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Request() req) {
      return this.authService.login(req.user);
    }
  
    // POST /auth/refresh  (JwtRefreshGuard validates the refresh token)
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
  }