/**
 * Remove do Cloudinary uploads abandonados e fotos sem uso há mais de 24h.
 * Pode ser agendado (ex.: Render Cron Job diário): npm run media:cleanup
 */
import 'dotenv/config';
import { loadEnv } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import { createContainer } from '../src/container.js';

const env = loadEnv();
const logger = createLogger(env);
const { services } = createContainer(env, logger);
if (!services.media.enabled) {
  console.log('Cloudinary não configurado; nada a limpar.');
} else {
  const result = await services.media.cleanup();
  console.log(`Limpeza concluída: ${result.removed} removida(s), ${result.failed} falha(s).`);
}
