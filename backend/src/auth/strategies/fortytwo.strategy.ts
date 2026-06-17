import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(OAuth2Strategy, '42') {
  constructor() {
    super(
      {
        authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
        tokenURL: 'https://api.intra.42.fr/oauth/token',
        clientID: process.env.FORTYTWO_CLIENT_ID,
        clientSecret: process.env.FORTYTWO_CLIENT_SECRET,
        callbackURL: process.env.FORTYTWO_CALLBACK_URL,
        scope: ['public'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        done(null, profile);
      },
    );
  }

  userProfile(accessToken: string, done: (err: any, profile?: any) => void) {
    fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          return done(new Error(`42 profile fetch failed with status ${res.status}`));
        }
        const profile = await res.json();
        return done(null, profile);
      })
      .catch(done);
  }
}
