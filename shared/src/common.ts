import { z } from 'zod';
import { PUBLICATION_STATUSES } from './constants.js';

export const idSchema = z.uuid({ error: 'Identificador inválido.' });
export const statusSchema = z.enum(PUBLICATION_STATUSES, { error: 'Status inválido.' });

/** Texto simples com espaços aparados e tamanho máximo. */
export const text = (max: number, label = 'Texto') =>
  z
    .string({ error: `${label} deve ser um texto.` })
    .trim()
    .max(max, { error: `${label} deve ter no máximo ${max} caracteres.` });

/** Texto obrigatório (não vazio). */
export const requiredText = (max: number, label: string) =>
  text(max, label).min(1, { error: `Preencha ${label.toLowerCase()}.` });

export const idParamsSchema = z.object({ id: idSchema });

export const reorderSchema = z.object({
  ids: z.array(idSchema).min(1, { error: 'Informe a nova ordem.' }).max(1000),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Envelope padrão de sucesso da API. */
export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
}

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'SERVICE_UNAVAILABLE',
  'UPLOAD_INVALID',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** Envelope padrão de erro da API. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

/**
 * Mantém apenas as chaves que realmente vieram no corpo da requisição.
 * Necessário em atualizações parciais porque o Zod aplica `default()` mesmo
 * em schemas `.partial()`, o que sobrescreveria campos não enviados.
 */
export function pickPresent<T extends object>(parsed: T, raw: unknown): Partial<T> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<T> = {};
  for (const key of Object.keys(parsed) as (keyof T)[]) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) out[key] = parsed[key];
  }
  return out;
}
