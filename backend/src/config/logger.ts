import pino, { type Logger } from 'pino';
import type { Env } from './env.js';

/** Logger estruturado. Cabeçalhos sensíveis e campos de senha/token são sempre ocultados. */
export function createLogger(env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        '*.password',
        '*.token',
        '*.access_token',
        '*.refresh_token',
        '*.signature',
        '*.api_secret',
      ],
      censor: '[oculto]',
    },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : {}),
  });
}
