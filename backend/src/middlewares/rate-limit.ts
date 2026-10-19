import type { ApiErrorBody } from '@cleides/shared';
import rateLimit, { type Options } from 'express-rate-limit';

const handler: Options['handler'] = (_req, res) => {
  const body: ApiErrorBody = { error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde um pouco e tente novamente.' } };
  res.status(429).json(body);
};

const base = { standardHeaders: 'draft-8', legacyHeaders: false, handler } as const;

/** Limite geral para todas as rotas da API. */
export const apiLimiter = (limit = 600) => rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit });

/** Limite para operações de escrita do painel. */
export const writeLimiter = (limit = 240) =>
  rateLimit({ ...base, windowMs: 5 * 60 * 1000, limit, skip: (req) => req.method === 'GET' });

/** Limite para emissão de assinaturas de upload. */
export const uploadLimiter = (limit = 120) => rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit });
