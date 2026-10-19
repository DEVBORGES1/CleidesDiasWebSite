import type { ApiErrorDetail, ErrorCode } from '@cleides/shared';
import type { ZodError } from 'zod';

/** Erro de negócio com status HTTP e mensagem segura para o cliente. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (message = 'Registro não encontrado.') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
export const unauthenticated = (message = 'Faça login para continuar.') => new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'Você não tem permissão para esta ação.') => new AppError(403, 'FORBIDDEN', message);
export const unavailable = (message: string) => new AppError(503, 'SERVICE_UNAVAILABLE', message);
export const uploadInvalid = (message: string) => new AppError(422, 'UPLOAD_INVALID', message);

export function validationError(details: ApiErrorDetail[], message = 'Confira os campos destacados.'): AppError {
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}

export function fromZod(error: ZodError): AppError {
  return validationError(
    error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })),
  );
}
