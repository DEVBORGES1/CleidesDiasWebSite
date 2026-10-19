/**
 * Insere o conteúdo de demonstração no Supabase sem sobrescrever dados reais.
 * Uso: npm run seed
 */
import 'dotenv/config';
import { loadEnv } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import { createContainer } from '../src/container.js';
import { seedDemoContent } from '../src/seed/demo-content.js';

const env = loadEnv();
if (env.DATA_DRIVER !== 'supabase') throw new Error('O seed grava no Supabase: use DATA_DRIVER=supabase.');
const logger = createLogger(env);
const { repos } = createContainer(env, logger);
const seeded = await seedDemoContent(repos, logger);
console.log(seeded.length ? `Inserido: ${seeded.join(', ')}` : 'Nada a inserir: o conteúdo já existe.');
