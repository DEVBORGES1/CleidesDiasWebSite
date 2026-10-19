import { randomUUID } from 'node:crypto';
import pino from 'pino';
import supertest from 'supertest';
import { createApp } from '../src/app.js';
import type { AuthProvider, AuthenticatedUser } from '../src/integrations/auth-provider.js';
import type { MediaStorage, StoredResource } from '../src/integrations/media-storage.js';
import { createMemoryRepositories } from '../src/repositories/memory/index.js';
import { createServices } from '../src/services/index.js';

/** Provedor de autenticação de teste: tokens conhecidos mapeiam para usuários. */
export class FakeAuthProvider implements AuthProvider {
  tokens = new Map<string, AuthenticatedUser>();
  async verifyToken(token: string) {
    return this.tokens.get(token) ?? null;
  }
}

/** Armazenamento de teste que simula o Cloudinary. */
export class FakeStorage implements MediaStorage {
  readonly enabled = true;
  resources = new Map<string, StoredResource>();
  destroyed: string[] = [];
  signUpload(publicId: string) {
    return { uploadUrl: 'https://upload.test/image/upload', apiKey: 'key', timestamp: 1, signature: 'sig', publicId, params: { public_id: publicId } };
  }
  async getResource(publicId: string) {
    return this.resources.get(publicId) ?? null;
  }
  async destroy(publicId: string) {
    this.destroyed.push(publicId);
    this.resources.delete(publicId);
  }
  /** Simula o navegador enviando o arquivo ao Cloudinary. */
  upload(publicId: string, r: Partial<StoredResource> = {}) {
    this.resources.set(publicId, {
      url: `https://res.cloudinary.com/demo/image/upload/v1/${publicId}.jpg`,
      format: 'jpg',
      width: 1600,
      height: 1200,
      bytes: 350_000,
      ...r,
    });
  }
}

export const ADMIN_TOKEN = 'token-admin';
export const USER_TOKEN = 'token-usuario-comum';

export function buildTestApp() {
  const repos = createMemoryRepositories();
  const auth = new FakeAuthProvider();
  const storage = new FakeStorage();
  const logger = pino({ level: 'silent' });
  const services = createServices({ repos, authProvider: auth, storage, logger });
  const app = createApp({
    env: { FRONTEND_URL: 'http://localhost:5173', SITE_URL: 'https://cleidesdias.com.br', TRUST_PROXY: 0, NODE_ENV: 'test' },
    logger,
    services,
  });

  const adminId = randomUUID();
  auth.tokens.set(ADMIN_TOKEN, { id: adminId, email: 'cleides@example.com' });
  repos.profiles.profiles.set(adminId, { id: adminId, email: 'cleides@example.com', fullName: 'Cleides', role: 'admin' });
  auth.tokens.set(USER_TOKEN, { id: randomUUID(), email: 'curioso@example.com' });

  const request = supertest(app);
  const admin = {
    get: (url: string) => request.get(url).set('Authorization', `Bearer ${ADMIN_TOKEN}`),
    post: (url: string, body?: object) => request.post(url).set('Authorization', `Bearer ${ADMIN_TOKEN}`).send(body),
    patch: (url: string, body?: object) => request.patch(url).set('Authorization', `Bearer ${ADMIN_TOKEN}`).send(body),
    put: (url: string, body?: object) => request.put(url).set('Authorization', `Bearer ${ADMIN_TOKEN}`).send(body),
    delete: (url: string) => request.delete(url).set('Authorization', `Bearer ${ADMIN_TOKEN}`),
  };

  /** Executa o fluxo completo de upload e devolve o arquivo confirmado. */
  async function uploadAsset(purpose = 'gallery', resource: Partial<StoredResource> = {}) {
    const sig = await admin.post('/api/v1/admin/uploads/signature', { purpose });
    storage.upload(sig.body.data.publicId, resource);
    const confirmed = await admin.post('/api/v1/admin/uploads/confirm', { publicId: sig.body.data.publicId });
    return confirmed.body.data as { id: string; publicId: string; url: string };
  }

  return { app, repos, services, auth, storage, request, admin, uploadAsset, adminId };
}
