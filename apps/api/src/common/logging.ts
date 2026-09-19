import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';
import type { Env } from '../config/env.schema.js';

const HEALTH_PATH = /\/health$/;

/**
 * Structured logging for the request, response and error paths.
 *
 * Every line is newline-delimited JSON carrying the request id, which is taken
 * from an inbound `x-request-id` header when a proxy supplies one and echoed
 * back on the response. That id is also attached to error responses, so a user
 * report can be traced to the exact request. Credentials and tokens are
 * redacted rather than filtered at the sink.
 */
export function buildLoggerParams(env: Pick<Env, 'LOG_LEVEL' | 'LOG_PRETTY'>): Params {
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      genReqId: (req, res) => {
        const header = req.headers['x-request-id'];
        const id = (Array.isArray(header) ? header[0] : header) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          'req.body.password',
        ],
        censor: '[redacted]',
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      // Liveness probes would otherwise dominate the log volume.
      autoLogging: {
        ignore: (req) => HEALTH_PATH.test(req.url ?? ''),
      },
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      transport: env.LOG_PRETTY
        ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss.l' } }
        : undefined,
    },
  };
}
