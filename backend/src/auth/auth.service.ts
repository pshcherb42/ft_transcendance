import { Injectable, ConflictException, UnauthorizedException, } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { TokenService } from './services/token.service';

@Injectable()
export class AuthService 
{
  constructor ( private readonly prisma: PrismaService, private readonly tokenService: TokenService, ) {}
  async register(registerDto: RegisterDto) 
  {
    const { email, username, password } = registerDto;
    const existingUser = await this.prisma.user.findFirst
    ({
      where: 
      {
        OR: [{ email }, { username }],
      },
    });
    if (existingUser) 
    {
      throw new ConflictException('El correu o nom d’usuari ja està en ús');
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await this.prisma.user.create
    ({
      data: 
      {
        email,
        username,
        password: hashedPassword,
      },
    });
    return { message: 'Usuari registrat correctament' };
  }
  async login(loginDto: LoginDto) 
  {
    const { username, password } = loginDto;
    const user = await this.prisma.user.findFirst
    ({
      where: 
      {
        OR: [{ email: username }, { username }],
      },
    });
    if (!user) 
    {
      throw new UnauthorizedException('Credencials incorrectes');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) 
    {
      throw new UnauthorizedException('Credencials incorrectes');
    }
    const accessToken = this.tokenService.generateAccesToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update
    ({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });
      return { accessToken, refreshToken};
    }
  async refresh(userId: string, refreshToken: string) 
  {
    const user = await this.prisma.user.findUnique
    ({
      where: { id: userId },
    });
    if (!user || !user.refreshToken) 
    {
      throw new UnauthorizedException('Refresh token invàlid');
    }
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) 
    {
      throw new UnauthorizedException('Refresh token invàlid');
    }
    const newAccessToken = this.tokenService.generateAccesToken(user);
    const newRefreshToken = this.tokenService.generateRefreshToken(user);
    const hashed = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.user.update
    ({
      where: { id: user.id },
      data: { refreshToken: hashed },
    });
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
  async logout(userId: string) 
  {
    await this.prisma.user.update
    ({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logout correcte' };
  }
  async oauthLogin(oauthUser: any) 
  {
    const email = oauthUser.email || oauthUser.emails?.[0]?.value;
    const username = oauthUser.username || email?.split('@')[0] || `user-${Date.now()}`;
    const avatarUrl = oauthUser.picture || oauthUser.photos?.[0]?.value || oauthUser.avatarUrl || null;

    let user = await this.prisma.user.findFirst
    ({
      where: { email },
    });

    if (!user) 
    {
      user = await this.prisma.user.create
      ({
        data: { email, username, password: '', avatarUrl },
      });
    } else if (!user.avatarUrl && avatarUrl) {
      await this.prisma.user.update
      ({
        where: { id: user.id },
        data: { avatarUrl },
      });
    }

    const accessToken = this.tokenService.generateAccesToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update
    ({
      where: { id: user.id },
      data: { refreshToken: hashed },
    });
    return { accessToken, refreshToken};
  } 
}