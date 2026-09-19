import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthUserDto, LoginInput, RegisterInput } from '@cloover/contracts';
import type { CookieOptions } from 'express';
import type { Env } from '../config/env.schema.js';
import type { User } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import type { JwtPayload } from './auth.types.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(input: RegisterInput): Promise<AuthUserDto> {
    const existing = await this.users.findByEmail(input.email);

    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }

    const user = await this.users.create({
      email: input.email,
      fullName: input.fullName,
      passwordHash: await this.passwords.hash(input.password),
    });

    return toAuthUser(user);
  }

  /**
   * Verifies credentials. The same message is returned whether the email is
   * unknown or the password is wrong, so the endpoint cannot be used to
   * enumerate registered accounts.
   */
  async validateCredentials(input: LoginInput): Promise<AuthUserDto> {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      await this.passwords.burnTime(input.password);
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await this.passwords.verify(user.passwordHash, input.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return toAuthUser(user);
  }

  issueToken(user: AuthUserDto): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
    };

    return this.jwt.sign(payload);
  }

  /**
   * The session token travels in an httpOnly cookie so that browser JavaScript
   * cannot read it, which removes the usual cross-site scripting path to token
   * theft. SameSite=Lax is sufficient because the browser only ever calls the
   * API through the Next.js server on the same origin.
   */
  cookieOptions(): CookieOptions {
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });

    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }
}

function toAuthUser(user: User): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}
