import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UsePipes } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  loginSchema,
  registerSchema,
  type AuthUserDto,
  type LoginInput,
  type RegisterInput,
  type SessionDto,
} from '@cloover/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { openApiSchemaOf } from '../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE_NAME, type AuthenticatedUser } from './auth.types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiBody({ schema: openApiSchemaOf(registerSchema) })
  @ApiResponse({ status: 201, description: 'Account created and session cookie set' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(
    @Body() body: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionDto> {
    const user = await this.auth.register(body);
    this.startSession(response, user);
    return { user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a session' })
  @ApiBody({ schema: openApiSchemaOf(loginSchema) })
  @ApiResponse({ status: 200, description: 'Session cookie set' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionDto> {
    const user = await this.auth.validateCredentials(body);
    this.startSession(response, user);
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE_NAME, this.auth.cookieOptions());
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Return the signed-in user' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  me(@CurrentUser() user: AuthenticatedUser): SessionDto {
    return { user };
  }

  private startSession(response: Response, user: AuthUserDto): void {
    response.cookie(SESSION_COOKIE_NAME, this.auth.issueToken(user), this.auth.cookieOptions());
  }
}
