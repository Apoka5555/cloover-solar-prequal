import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from './auth/auth.types.js';

/**
 * Serves an interactive reference at `<prefix>/docs` and the raw document at
 * `<prefix>/docs-json`. The request schemas come from the shared Zod schemas,
 * so the documentation cannot describe rules the API does not enforce.
 */
export function setupOpenApi(app: INestApplication, globalPrefix: string): void {
  const config = new DocumentBuilder()
    .setTitle('Cloover pre-qualification API')
    .setDescription(
      'Prices residential solar systems and returns instalment offers. ' +
        'Sign in through POST /auth/login to obtain the session cookie that ' +
        'the protected endpoints require.',
    )
    .setVersion('1.0.0')
    .addCookieAuth(SESSION_COOKIE_NAME, { type: 'apiKey', in: 'cookie' })
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('auth', 'Registration, sign-in and session')
    .addTag('quotes', 'Pre-qualification requests and their results')
    .addTag('admin', 'Cross-user reads, restricted to administrators')
    .addTag('health', 'Liveness and readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
    jsonDocumentUrl: `${globalPrefix}/docs-json`,
    swaggerOptions: { persistAuthorization: true },
  });
}
