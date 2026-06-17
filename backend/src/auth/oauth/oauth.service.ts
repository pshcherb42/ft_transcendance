import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class OauthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateOAuthProfile(profile: {
    id: string;
    provider?: string;
    displayName?: string;
    emails?: Array<{ value: string }>;
  }) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('OAuth profile does not contain an email');
    }

    return {
      email,
      oauthId: profile.id,
      provider: profile.provider ?? 'oauth',
      username: profile.displayName ?? email.split('@')[0],
    };
  }

  async signOAuthUser(user: {
    id: string | number;
    email: string;
    provider?: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.provider ?? 'oauth',
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
