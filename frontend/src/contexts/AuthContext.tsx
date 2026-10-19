import type { AdminProfile } from '@cleides/shared';
import type { GoTrueClient as AuthClient, Session } from '@supabase/auth-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authConfigured, env } from '../lib/env';
import { loadAuthClient } from '../lib/authClient';
import { adminApi } from '../services/api';
import { ApiError, configureAuth } from '../services/http';

type AuthStatus = 'idle' | 'loading' | 'unconfigured' | 'signedOut' | 'signedIn' | 'forbidden';

interface AuthContextValue {
  status: AuthStatus;
  profile: AdminProfile | null;
  /** Indica que a usuária chegou pelo link de redefinição de senha. */
  recovering: boolean;
  /** Carrega o cliente de autenticação (feito sob demanda no painel e na prévia). */
  activate(): void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const authErrorMessage = (message: string) => {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/rate limit|too many/i.test(message)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (/should be different/i.test(message)) return 'A nova senha precisa ser diferente da atual.';
  if (/password/i.test(message) && /least|weak|short/i.test(message)) return 'Escolha uma senha mais forte (mínimo de 10 caracteres).';
  return 'Não foi possível concluir. Tente novamente.';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(authConfigured ? 'idle' : 'unconfigured');
  const clientRef = useRef<AuthClient | null>(null);
  const activated = useRef(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [recovering, setRecovering] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const loadProfile = useCallback(async (session: Session | null) => {
    sessionRef.current = session;
    if (!session) {
      setProfile(null);
      setStatus('signedOut');
      return;
    }
    try {
      setProfile(await adminApi.me());
      setStatus('signedIn');
    } catch (err) {
      setProfile(null);
      setStatus(err instanceof ApiError && err.status === 403 ? 'forbidden' : 'signedOut');
    }
  }, []);

  const activate = useCallback(() => {
    const loading = loadAuthClient();
    if (!loading || activated.current) return;
    activated.current = true;
    setStatus('loading');
    void loading.then(async (client) => {
      clientRef.current = client;
      configureAuth(
        async () => (await client.getSession()).data.session?.access_token ?? null,
        () => {
          sessionRef.current = null;
          setProfile(null);
          setStatus('signedOut');
        },
      );
      client.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') setRecovering(true);
        if (event === 'SIGNED_OUT') void loadProfile(null);
        if (event === 'SIGNED_IN' && session?.access_token !== sessionRef.current?.access_token) void loadProfile(session);
        if (event === 'TOKEN_REFRESHED') sessionRef.current = session;
      });
      const { data } = await client.getSession();
      await loadProfile(data.session);
    });
  }, [loadProfile]);

  // O painel, a pré-visualização e os links de recuperação de senha precisam do login.
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin') || /[?&]preview=1/.test(window.location.search)) activate();
  }, [activate]);

  const requireClient = useCallback(async (): Promise<AuthClient> => {
    const loading = loadAuthClient();
    if (!loading) throw new Error('Login não configurado.');
    activate();
    return loading;
  }, [activate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      recovering,
      activate,
      async signIn(email, password) {
        const client = await requireClient();
        const { data, error } = await client.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(authErrorMessage(error.message));
        await loadProfile(data.session);
      },
      async signOut() {
        await clientRef.current?.signOut();
        await loadProfile(null);
      },
      async sendPasswordReset(email) {
        const client = await requireClient();
        const { error } = await client.resetPasswordForEmail(email.trim(), {
          redirectTo: `${env.siteUrl}/admin/redefinir-senha`,
        });
        if (error) throw new Error(authErrorMessage(error.message));
      },
      async updatePassword(password) {
        const client = await requireClient();
        const { error } = await client.updateUser({ password });
        if (error) throw new Error(authErrorMessage(error.message));
        setRecovering(false);
      },
    }),
    [status, profile, recovering, loadProfile, activate, requireClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
