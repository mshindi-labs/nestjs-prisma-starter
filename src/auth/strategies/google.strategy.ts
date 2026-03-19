import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} from '../../common/constants';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id: googleId, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;
    const avatar = photos?.[0]?.value;

    const result = await this.authService.signInWithGoogle({
      googleId,
      email,
      name: displayName,
      avatar,
    });

    done(null, result);
  }
}
