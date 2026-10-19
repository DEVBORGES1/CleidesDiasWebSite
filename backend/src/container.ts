import { createClient } from '@supabase/supabase-js';
import type { Logger } from 'pino';
import { cloudinaryConfigured, type Env } from './config/env.js';
import { DisabledAuthProvider, SupabaseAuthProvider, type AuthProvider } from './integrations/auth-provider.js';
import { CloudinaryStorage, DisabledStorage, type MediaStorage } from './integrations/media-storage.js';
import { createMemoryRepositories } from './repositories/memory/index.js';
import { createSupabaseRepositories } from './repositories/supabase/index.js';
import type { Repositories } from './repositories/types.js';
import { createServices, type Services } from './services/index.js';

/** Monta as dependências reais da aplicação a partir das variáveis de ambiente. */
export function createContainer(env: Env, logger: Logger): { services: Services; repos: Repositories } {
  const supabase =
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        })
      : null;

  let repos: Repositories;
  if (env.DATA_DRIVER === 'memory') {
    repos = createMemoryRepositories();
  } else {
    if (!supabase) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias com DATA_DRIVER=supabase.');
    repos = createSupabaseRepositories(supabase);
  }

  // Sem Supabase (apenas DATA_DRIVER=memory), o site público funciona e o painel fica indisponível.
  const authProvider: AuthProvider = supabase ? new SupabaseAuthProvider(supabase) : new DisabledAuthProvider();
  if (!supabase) logger.warn('Supabase não configurado: o login do painel ficará indisponível.');

  const storage: MediaStorage = cloudinaryConfigured(env)
    ? new CloudinaryStorage({
        cloudName: env.CLOUDINARY_CLOUD_NAME!,
        apiKey: env.CLOUDINARY_API_KEY!,
        apiSecret: env.CLOUDINARY_API_SECRET!,
        uploadPrefix: env.CLOUDINARY_UPLOAD_PREFIX,
      })
    : new DisabledStorage();
  if (!storage.enabled) logger.warn('Cloudinary não configurado: o envio de fotos ficará indisponível.');

  const services = createServices({ repos, authProvider, storage, logger });
  return { services, repos };
}
