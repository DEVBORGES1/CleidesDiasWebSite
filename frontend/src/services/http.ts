import type { ApiErrorBody, ApiErrorDetail, ErrorCode, PaginationMeta } from '@cleides/shared';
import { env } from '../lib/env';

/** Erro de API com mensagem pronta para exibir à usuária. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Mensagem do campo indicado (para destacar o campo no formulário). */
  field(path: string): string | undefined {
    return this.details.find((d) => d.path === path || d.path.startsWith(`${path}.`))?.message;
  }
}

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;
let onUnauthorized: () => void = () => {};

/** Registrado pelo contexto de autenticação. */
export function configureAuth(provider: TokenProvider, unauthorized: () => void): void {
  tokenProvider = provider;
  onUnauthorized = unauthorized;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth) {
    const token = await tokenProvider();
    if (!token) {
      onUnauthorized();
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sua sessão expirou. Entre novamente.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar. Verifique sua internet e tente novamente.');
  }

  if (res.status === 204) return { data: undefined as T };
  const json = (await res.json().catch(() => null)) as ({ data: T; meta?: PaginationMeta } & Partial<ApiErrorBody>) | null;
  if (!res.ok || !json) {
    const err = json?.error;
    if (res.status === 401 && options.auth) onUnauthorized();
    throw new ApiError(res.status, err?.code ?? 'INTERNAL_ERROR', err?.message ?? 'Algo deu errado. Tente novamente.', err?.details);
  }
  return json;
}

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Algo deu errado. Tente novamente.';
