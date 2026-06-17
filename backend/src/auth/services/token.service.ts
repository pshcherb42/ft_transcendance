import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenService
{
  constructor(private readonly jwt: JwtService) {}
  generateAccesToken(user: any)
  {
    return this.jwt.sign
    ({
      sub: user.id,
      username: user.username,
      email: user.email,
    },
    {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
  }
  generateRefreshToken(user: any)
  {
    return this.jwt.sign
    ({
      sub: user.id,
    },
    {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
  }
}