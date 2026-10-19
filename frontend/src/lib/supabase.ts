import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authConfigured, env } from './env';

/**
 * Cliente Supabase do navegador. É usado SOMENTE para autenticação
 * (login, sessão e recuperação de senha); dados passam sempre pela API.
 */
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null;
