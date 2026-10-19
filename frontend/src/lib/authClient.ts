import type { GoTrueClient } from '@supabase/auth-js';
import { authConfigured, env } from './env';

let client: Promise<GoTrueClient> | null = null;

/**
 * Cliente do Supabase Auth, carregado sob demanda (só no painel e na
 * pré-visualização), para não pesar no site dos visitantes. Ele é usado
 * SOMENTE para autenticação; os dados passam sempre pela API própria.
 */
export function loadAuthClient(): Promise<GoTrueClient> | null {
  if (!authConfigured) return null;
  client ??= import('@supabase/auth-js').then(
    ({ GoTrueClient: AuthClient }) =>
      new AuthClient({
        url: `${env.supabaseUrl}/auth/v1`,
        headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${env.supabaseAnonKey}` },
        storageKey: `sb-${new URL(env.supabaseUrl).hostname.split('.')[0]}-auth-token`,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      }),
  );
  return client;
}
