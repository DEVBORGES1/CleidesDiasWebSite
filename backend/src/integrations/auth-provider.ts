import type { SupabaseClient } from '@supabase/supabase-js';
import { unavailable } from '../lib/errors.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/** Verifica tokens de acesso emitidos pelo provedor de identidade. */
export interface AuthProvider {
  /** Retorna o usuário dono do token ou `null` se o token for inválido/expirado. */
  verifyToken(token: string): Promise<AuthenticatedUser | null>;
}

/**
 * Valida o JWT consultando o Supabase Auth (`/auth/v1/user`). Assim tokens
 * revogados (logout, troca de senha) deixam de funcionar imediatamente.
 */
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly client: SupabaseClient) {}

  async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.client.auth.getUser(token);
    if (error) {
      const status = (error as { status?: number }).status ?? 0;
      if (status === 0 || status >= 500) throw unavailable('Não foi possível verificar o login agora. Tente novamente.');
      return null;
    }
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? '' };
  }
}

/** Usado quando o Supabase não está configurado (desenvolvimento com DATA_DRIVER=memory). */
export class DisabledAuthProvider implements AuthProvider {
  async verifyToken(): Promise<AuthenticatedUser | null> {
    throw unavailable('O login do painel não está configurado neste ambiente.');
  }
}
