import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.types.js';

/** Injects the authenticated principal that the JWT strategy attached. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new Error('CurrentUser used on a route that is not authenticated');
    }

    return request.user;
  },
);
