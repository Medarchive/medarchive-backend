import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_PORT: z.coerce.number().default(9090),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  API_KEY_SECRET: z.string().min(32),

  RESEND_API_KEY: z.string().check(z.startsWith('re_')),
  EMAIL_FROM: z.email(),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET: z.string(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env;

export function validateEnv(raw: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  _env = result.data;
  return _env;
}

export function env(): Env {
  if (!_env) throw new Error('env() called before validateEnv()');
  return _env;
}
