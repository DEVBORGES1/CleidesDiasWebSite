import 'dotenv/config';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createContainer } from './container.js';
import { MemoryProfiles } from './repositories/memory/index.js';
import { seedDemoContent } from './seed/demo-content.js';

const env = loadEnv();
const logger = createLogger(env);
const { services, repos } = createContainer(env, logger);

if (env.DATA_DRIVER === 'memory') {
  logger.warn('DATA_DRIVER=memory: os dados ficam apenas na memória e serão perdidos ao reiniciar.');
  if (env.MEMORY_SEED) await seedDemoContent(repos, logger);
  if (env.MEMORY_ADMIN_USER_ID && 'profiles' in repos && repos.profiles instanceof MemoryProfiles) {
    repos.profiles.profiles.set(env.MEMORY_ADMIN_USER_ID, {
      id: env.MEMORY_ADMIN_USER_ID,
      email: env.MEMORY_ADMIN_EMAIL ?? '',
      fullName: 'Administradora (local)',
      role: 'admin',
    });
  }
}

const app = createApp({ env, logger, services });
const server = app.listen(env.PORT, () => {
  logger.info(`API ouvindo em http://localhost:${env.PORT}/api/v1`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} recebido, encerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'Promise rejeitada sem tratamento'));
