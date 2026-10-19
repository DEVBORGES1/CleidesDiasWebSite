import { createClient } from '@supabase/supabase-js';
import type { Logger } from 'pino';
import { cloudinaryConfigured, type Env } from './config/env.js';
import { SupabaseAuthProvider } from './integrations/auth-provider.js';
import { CloudinaryStorage, DisabledStorage, type MediaStorage } from './integrations/media-storage.js';
import { createMemoryRepositories } from './repositories/memory/index.js';
import { createSupabaseRepositories } from './repositories/supabase/index.js';
import type { Repositories } from './repositories/types.js';
import { createServices, type Services } from './services/index.js';

/** Monta as dependências reais da aplicação a partir das variáveis de ambiente. */
export function createContainer(env: Env, logger: Logger): { services: Services; repos: Repositories } {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias (o login do painel usa o Supabase Auth).');
  }
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const repos = env.DATA_DRIVER === 'memory' ? createMemoryRepositories() : createSupabaseRepositories(supabase);

  const storage: MediaStorage = cloudinaryConfigured(env)
    ? new CloudinaryStorage({
        cloudName: env.CLOUDINARY_CLOUD_NAME!,
        apiKey: env.CLOUDINARY_API_KEY!,
        apiSecret: env.CLOUDINARY_API_SECRET!,
        uploadPrefix: env.CLOUDINARY_UPLOAD_PREFIX,
      })
    : new DisabledStorage();
  if (!storage.enabled) logger.warn('Cloudinary não configurado: o envio de fotos ficará indisponível.');

  const services = createServices({ repos, authProvider: new SupabaseAuthProvider(supabase), storage, logger });
  return { services, repos };
}
