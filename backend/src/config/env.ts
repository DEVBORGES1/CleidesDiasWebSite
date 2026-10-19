import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Origens autorizadas no CORS, separadas por vírgula. */
    FRONTEND_URL: z.string().min(1).default('http://localhost:5173'),
    /** Endereço público do site (usado no sitemap). */
    SITE_URL: z.url().default('http://localhost:5173'),
    /** Quantidade de proxies confiáveis à frente da API (Render/Vercel = 1). */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /** `supabase` em produção; `memory` apenas para desenvolvimento local e testes. */
    DATA_DRIVER: z.enum(['supabase', 'memory']).default('supabase'),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_ANON_KEY: z.string().min(20).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    /** Somente para testes automatizados: aponta o SDK para um servidor simulado. */
    CLOUDINARY_UPLOAD_PREFIX: z.url().optional(),
    /** Semeia dados de demonstração ao iniciar com DATA_DRIVER=memory. */
    MEMORY_SEED: bool,
  })
  .superRefine((env, ctx) => {
    if (env.DATA_DRIVER === 'memory' && env.NODE_ENV === 'production') {
      ctx.addIssue({ code: 'custom', path: ['DATA_DRIVER'], message: 'DATA_DRIVER=memory não pode ser usado em produção.' });
    }
    if (env.DATA_DRIVER === 'supabase' || env.NODE_ENV === 'production') {
      for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} é obrigatória.` });
      }
    }
    if (env.NODE_ENV === 'production' && env.CLOUDINARY_UPLOAD_PREFIX) {
      ctx.addIssue({ code: 'custom', path: ['CLOUDINARY_UPLOAD_PREFIX'], message: 'Use apenas em testes.' });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`);
  }
  return parsed.data;
}

export function allowedOrigins(env: Pick<Env, 'FRONTEND_URL'>): string[] {
  return env.FRONTEND_URL.split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function cloudinaryConfigured(env: Env): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}
