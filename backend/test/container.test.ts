import pino from 'pino';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createContainer } from '../src/container.js';

describe('montagem das dependências', () => {
  it('com DATA_DRIVER=memory funciona sem Supabase e deixa o painel indisponível', async () => {
    const env = loadEnv({ NODE_ENV: 'development', DATA_DRIVER: 'memory' });
    const logger = pino({ level: 'silent' });
    const { services } = createContainer(env, logger);
    const request = supertest(createApp({ env, logger, services }));

    expect((await request.get('/api/v1/site')).status).toBe(200);
    const admin = await request.get('/api/v1/admin/me').set('Authorization', 'Bearer qualquer-token');
    expect(admin.status).toBe(503);
    expect(admin.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('com DATA_DRIVER=supabase exige as credenciais', () => {
    expect(() => loadEnv({ NODE_ENV: 'development', DATA_DRIVER: 'supabase' })).toThrow();
  });
});
