import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : /^(1|true|yes|on)$/i.test(value)));

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

/**
 * The complete configuration surface of the API. Every value arrives as an
 * environment variable and is validated once, at boot, so a misconfigured
 * deployment fails immediately and loudly instead of at the first request.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  API_GLOBAL_PREFIX: z.string().default('api'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters; generate one with `openssl rand -base64 48`'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  COOKIE_SECURE: booleanish.default(false),
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((value) => (value === '' ? undefined : value)),

  /** Comma-separated list of browser origins allowed to send credentials. */
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  LOG_PRETTY: booleanish.default(false),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}
