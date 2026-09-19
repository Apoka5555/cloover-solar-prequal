import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import type { Env } from './config/env.schema.js';
import { setupOpenApi } from './openapi.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.flushLogs();

  const globalPrefix = configureApp(app);
  const port = app.get(ConfigService<Env, true>).get('API_PORT', { infer: true });

  setupOpenApi(app, globalPrefix);

  await app.listen(port, '0.0.0.0');

  app.get(Logger).log(`API listening on port ${port} under /${globalPrefix}`);
}

await bootstrap();
