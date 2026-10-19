import type { ApiErrorBody } from '@cleides/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: 'Endereço não encontrado.' } };
  res.status(404).json(body);
};

/** Tratamento centralizado: respostas padronizadas e sem detalhes internos. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    let status = 500;
    let body: ApiErrorBody = { error: { code: 'INTERNAL_ERROR', message: 'Algo deu errado. Tente novamente em instantes.' } };

    if (err instanceof AppError) {
      status = err.status;
      body = { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    } else if (err?.type === 'entity.parse.failed') {
      status = 400;
      body = { error: { code: 'VALIDATION_ERROR', message: 'O corpo da requisição não é um JSON válido.' } };
    } else if (err?.type === 'entity.too.large') {
      status = 413;
      body = { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Os dados enviados são grandes demais.' } };
    }

    const log = { method: req.method, url: req.originalUrl, status, code: body.error.code };
    if (status >= 500) logger.error({ ...log, err }, 'Erro ao processar requisição');
    else logger.info(log, 'Requisição rejeitada');

    if (res.headersSent) return;
    res.status(status).json(body);
  };
}
