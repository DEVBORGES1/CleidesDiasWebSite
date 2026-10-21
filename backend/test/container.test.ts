import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import pino from 'pino';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createContainer, fetchWithTimeout } from '../src/container.js';

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

describe('chamadas a serviços externos', () => {
  it('desistem após o tempo limite em vez de deixar a requisição pendurada', async () => {
    const server = createServer(() => {}); // aceita a conexão e nunca responde
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const started = Date.now();
    await expect(fetchWithTimeout(200)(`http://127.0.0.1:${port}/`)).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2000);
    server.closeAllConnections();
    server.close();
  });
});
