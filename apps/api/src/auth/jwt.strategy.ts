import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '../config/env.schema.js';
import { UsersService } from '../users/users.service.js';
import { SESSION_COOKIE_NAME, type AuthenticatedUser, type JwtPayload } from './auth.types.js';

function fromSessionCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, string> | undefined;
  return cookies?.[SESSION_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly users: UsersService,
  ) {
    super({
      // Browsers send the session cookie; scripted clients and the Swagger UI
      // send a bearer token. Both reach the same code path.
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromSessionCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  /**
   * Re-reads the user on every request rather than trusting the claims. It
   * costs one indexed lookup, and in exchange a deleted account or a changed
   * role takes effect immediately instead of when the token expires.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
