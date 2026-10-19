import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { allowedOrigins, type Env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { apiLimiter } from './middlewares/rate-limit.js';
import { adminRoutes, publicRoutes } from './routes/index.js';
import type { Services } from './services/index.js';

export interface AppDeps {
  env: Pick<Env, 'FRONTEND_URL' | 'SITE_URL' | 'TRUST_PROXY' | 'NODE_ENV'>;
  logger: Logger;
  services: Services;
}

export function createApp({ env, logger, services }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('etag', 'strong');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  const origins = allowedOrigins(env);
  app.use(
    cors({
      origin(origin, callback) {
        // Requisições sem Origin (curl, health checks, mesmo domínio) são permitidas;
        // navegadores de outras origens recebem a resposta sem cabeçalhos CORS.
        callback(null, !origin || origins.includes(origin));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  );

  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
        serializers: {
          req: (req) => ({ id: req.id, method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      }),
    );
  }

  app.use(express.json({ limit: '200kb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ data: { status: 'ok', time: new Date().toISOString() } });
  });

  app.use('/api/v1', apiLimiter());
  app.use('/api/v1/admin', adminRoutes(services));
  app.use('/api/v1', publicRoutes(services, env.SITE_URL));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
