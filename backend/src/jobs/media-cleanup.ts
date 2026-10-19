/**
 * Remove do Cloudinary uploads abandonados e fotos sem uso há mais de 24h.
 * Agendado no Render (cron diário): node backend/dist/jobs/media-cleanup.js
 */
import 'dotenv/config';
import { loadEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { createContainer } from '../container.js';

const env = loadEnv();
const logger = createLogger(env);
const { services } = createContainer(env, logger);
if (!services.media.enabled) {
  console.log('Cloudinary não configurado; nada a limpar.');
} else {
  const result = await services.media.cleanup();
  console.log(`Limpeza concluída: ${result.removed} removida(s), ${result.failed} falha(s).`);
}
