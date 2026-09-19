import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.schema.js';
import { setupOpenApi } from './openapi.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.flushLogs();

  const config = app.get(ConfigService<Env, true>);
  const globalPrefix = config.get('API_GLOBAL_PREFIX', { infer: true });
  const port = config.get('API_PORT', { infer: true });

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

  setupOpenApi(app, globalPrefix);
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  app.get(Logger).log(`API listening on port ${port} under /${globalPrefix}`);
}

await bootstrap();
