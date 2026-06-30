import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // Called by LocalStrategy — validates email+password
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) return null;
    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;
    return this.usersService.sanitize(user);
  }

  // Generate both tokens and store hashed refresh token
  async login(user: { id: string; email: string }) {
    const tokens = await this.generateTokens(user.id, user.email);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // Register new user then log them in
  async register(email: string, username: string, password: string) {
    const user = await this.usersService.create({ email, username, password });
    return this.login({ id: user.id, email: user.email });
  }

  // Rotate refresh token — called by JwtRefreshGuard
  async refreshTokens(userId: string, email: string) {
    const tokens = await this.generateTokens(userId, email);
    await this.usersService.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  // Clear stored refresh token on logout
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  // Find-or-create user from Google OAuth, then issue JWT pair
async googleLogin(email: string, displayName: string) {
  let user = await this.usersService.findByEmail(email);
  if (!user) {
    // Create with no password — Google users can't log in with local strategy
    user = await this.usersService.create({
      email,
      username: displayName,
      password: null,
    });
  }
  return this.login({ id: user.id, email: user.email });
}

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }
}