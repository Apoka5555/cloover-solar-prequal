import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Env } from './config/env.schema.js';

/**
 * Applies everything that sits between the network and the controllers.
 *
 * Both the server entry point and the integration tests call this, so the
 * suite exercises the same middleware, prefix and CORS policy that production
 * runs rather than an approximation of them.
 */
export function configureApp(app: INestApplication): string {
  const config = app.get(ConfigService<Env, true>);
  const globalPrefix = config.get('API_GLOBAL_PREFIX', { infer: true });

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix(globalPrefix);

  // Browsers normally reach the API through the Next.js server on the same
  // origin. Direct cross-origin access is still allowed for the Swagger UI and
  // for scripted clients, restricted to an explicit list of origins.
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  app.enableShutdownHooks();

  return globalPrefix;
}
