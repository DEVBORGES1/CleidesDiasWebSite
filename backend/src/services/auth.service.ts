import type { AdminProfile } from '@cleides/shared';
import type { AuthProvider } from '../integrations/auth-provider.js';
import { forbidden, unauthenticated } from '../lib/errors.js';
import type { Repositories } from '../repositories/types.js';

export class AuthService {
  constructor(
    private readonly provider: AuthProvider,
    private readonly repos: Repositories,
  ) {}

  /**
   * Autentica o token e confirma, no banco, que o usuário é administrador.
   * Papéis enviados pelo navegador nunca são considerados.
   */
  async authenticateAdmin(authorization: string | undefined): Promise<AdminProfile> {
    const token = /^Bearer\s+(.+)$/i.exec(authorization ?? '')?.[1]?.trim();
    if (!token) throw unauthenticated();
    const user = await this.provider.verifyToken(token);
    if (!user) throw unauthenticated('Sua sessão expirou. Entre novamente.');
    const profile = await this.repos.profiles.findById(user.id);
    if (!profile) throw forbidden('Esta conta não tem acesso ao painel.');
    return profile;
  }
}
