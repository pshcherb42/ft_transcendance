import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from './mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
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

  async forgotPassword(email: string, lang?: string) {
    const user = await this.usersService.findByEmail(email);
    //for security reasons, always return the same response!
    if (!user || !user.password) return null;
    const token = await this.jwtService.signAsync(
      { sub: user.id, purpose: 'password-reset' },
      { secret: this.config.get<string>('JWT_RESET_SECRET'), expiresIn: '30m' },
    );

    const frontend =
      process.env.FRONTEND_URL ?? 'https://transcendance.rmanzanas.com';
    await this.mailService.sendPasswordReset(
      user.email,
      `${frontend}/reset-password?token=${token}`,
      lang,
    );
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_RESET_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        code: 'RESET_TOKEN_INVALID',
        message: 'This reset link is invalid or has expired',
      });
    }
    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException({
        code: 'RESET_TOKEN_INVALID',
        message: 'This reset link is invalid or has expired',
      });
    }
    await this.usersService.setPassword(payload.sub, newPassword);
  }

  // Google gives no username, so derive one from the email and append a
  // numeric suffix if it's already taken (username is a unique column).
  private async makeUniqueUsername(seed: string): Promise<string> {
    const base =
      seed
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 16) || 'ft_user';

    let candidateName = base;
    let n = 0;
    while (await this.usersService.findByUsername(candidateName)) {
      n++;
      candidateName = `${base}${n}`.slice(0, 20);
    }
    return candidateName;
  }

  async googleLogin(email: string, providerId: string) {
    let user = await this.usersService.findByEmail(email);
    if (!user) {
      const username = await this.makeUniqueUsername(email.split('@')[0]);
      user = await this.usersService.create({
        email,
        username,
        password: null,
        authProvider: 'GOOGLE',
        providerId,
      });
    }
    return this.login({ id: user.id, email: user.email });
  }

  private async generateTokens(userId: string, email: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: userId,
      email,
      username: user.username,
    };

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
