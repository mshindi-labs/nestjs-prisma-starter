import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../dto/auth-response.dto';
import { AuthorizedUser } from '../../common/types/authenticated-request';
import { JWT_SECRET } from '../../common/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthorizedUser> {
    try {
      const user = await this.authService.validateUser(payload);
      return user;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
