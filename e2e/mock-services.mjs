/**
 * Serviços simulados usados SOMENTE nos testes ponta a ponta:
 *  - Supabase Auth (login, sessão, usuário, logout, recuperação)
 *  - Cloudinary (upload assinado, consulta e exclusão de arquivos)
 *
 * A assinatura dos uploads é verificada com o mesmo algoritmo do Cloudinary,
 * garantindo que o backend assina corretamente os parâmetros.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 54321);
const API_SECRET = process.env.MOCK_CLOUDINARY_SECRET ?? 'test-cloudinary-secret';
const ADMIN = {
  id: process.env.MOCK_ADMIN_ID ?? '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  email: process.env.MOCK_ADMIN_EMAIL ?? 'cleides@example.com',
  password: process.env.MOCK_ADMIN_PASSWORD ?? 'senha-segura-123',
};

const tokens = new Map(); // access_token -> user
const files = new Map(); // public_id -> { buf, format, width, height }

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function issue(user) {
  const now = Math.floor(Date.now() / 1000);
  const access = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now, session_id: randomUUID() })}.assinatura-falsa`;
  tokens.set(access, user);
  return {
    access_token: access,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: randomUUID(),
    user: userJson(user),
  };
}
const userJson = (u) => ({
  id: u.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: u.email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: new Date().toISOString(),
});

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...(body !== undefined && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  });
  res.end(body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

function parseMultipart(buf, contentType) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType ?? '');
  const sep = Buffer.from(`--${boundary?.[1] ?? boundary?.[2]}`);
  const fields = {};
  let file = null;
  let start = buf.indexOf(sep) + sep.length;
  while (start > sep.length - 1) {
    const end = buf.indexOf(sep, start);
    if (end < 0) break;
    const part = buf.subarray(start + 2, end - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    const header = part.subarray(0, headerEnd).toString();
    const content = part.subarray(headerEnd + 4);
    const name = /name="([^"]+)"/.exec(header)?.[1];
    if (/filename="/.test(header)) file = content;
    else if (name) fields[name] = content.toString();
    start = end + sep.length;
  }
  return { fields, file };
}

/** Lê largura/altura de JPEG ou PNG. */
function imageInfo(buf) {
  if (buf.subarray(1, 4).toString() === 'PNG') return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { format: 'jpg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  if (buf.subarray(8, 12).toString() === 'WEBP') return { format: 'webp', width: 1000, height: 1000 };
  return { format: 'gif', width: 100, height: 100 };
}

function cloudinarySignature(fields) {
  const exclude = new Set(['file', 'api_key', 'signature', 'resource_type', 'cloud_name']);
  const toSign = Object.keys(fields)
    .filter((k) => !exclude.has(k) && fields[k] !== '')
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('&');
  return createHash('sha1').update(toSign + API_SECRET).digest('hex');
}

const resourceJson = (publicId, f) => ({
  public_id: publicId,
  format: f.format,
  width: f.width,
  height: f.height,
  bytes: f.buf.length,
  secure_url: `http://localhost:${PORT}/media/${publicId}.${f.format}`,
  resource_type: 'image',
  type: 'upload',
});

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  if (req.method === 'OPTIONS') return send(res, 204);

  // ---------------- Supabase Auth ----------------
  if (path === '/auth/v1/token' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      if (body.email?.toLowerCase() === ADMIN.email && body.password === ADMIN.password) return send(res, 200, issue(ADMIN));
      return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    if (grant === 'refresh_token') return send(res, 200, issue(ADMIN));
    return send(res, 400, { msg: 'unsupported grant' });
  }
  if (path === '/auth/v1/user') {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const user = tokens.get(token);
    if (!user) return send(res, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
    if (req.method === 'PUT') await readBody(req);
    return send(res, 200, userJson(user));
  }
  if (path === '/auth/v1/logout') {
    tokens.delete((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
    return send(res, 204);
  }
  if (path === '/auth/v1/recover') return send(res, 200, {});

  // ---------------- Cloudinary ----------------
  let m = /^\/v1_1\/[^/]+\/image\/upload$/.exec(path);
  if (m && req.method === 'POST') {
    const { fields, file } = parseMultipart(await readBody(req), req.headers['content-type']);
    if (!file) return send(res, 400, { error: { message: 'Missing required parameter - file' } });
    if (fields.signature !== cloudinarySignature(fields)) return send(res, 401, { error: { message: 'Invalid Signature' } });
    if (Math.abs(Date.now() / 1000 - Number(fields.timestamp)) > 3600) return send(res, 400, { error: { message: 'Stale request' } });
    const info = imageInfo(file);
    if (!info || !String(fields.allowed_formats ?? 'jpg,png,webp').split(',').includes(info.format)) {
      return send(res, 400, { error: { message: `Image format ${info?.format} not allowed` } });
    }
    if (fields.overwrite === 'false' && files.has(fields.public_id)) return send(res, 409, { error: { message: 'already exists' } });
    files.set(fields.public_id, { buf: file, ...info });
    return send(res, 200, resourceJson(fields.public_id, files.get(fields.public_id)));
  }
  m = /^\/v1_1\/[^/]+\/resources\/image\/upload\/(.+)$/.exec(path);
  if (m && req.method === 'GET') {
    const publicId = decodeURIComponent(m[1]);
    const f = files.get(publicId);
    return f ? send(res, 200, resourceJson(publicId, f)) : send(res, 404, { error: { message: `Resource not found - ${publicId}` } });
  }
  m = /^\/v1_1\/[^/]+\/image\/destroy$/.exec(path);
  if (m && req.method === 'POST') {
    const raw = (await readBody(req)).toString();
    const fields = raw.startsWith('{') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
    const existed = files.delete(fields.public_id);
    return send(res, 200, { result: existed ? 'ok' : 'not found' });
  }
  m = /^\/media\/(.+)\.(jpg|png|webp)$/.exec(path);
  if (m) {
    const f = files.get(m[1]);
    return f ? send(res, 200, f.buf, { 'Content-Type': `image/${f.format === 'jpg' ? 'jpeg' : f.format}`, 'Cross-Origin-Resource-Policy': 'cross-origin' }) : send(res, 404, { error: 'not found' });
  }
  if (path === '/__mock/state') return send(res, 200, { files: [...files.keys()], sessions: tokens.size });

  send(res, 404, { error: `mock: rota não encontrada ${req.method} ${path}` });
}).listen(PORT, () => console.log(`Serviços simulados em http://localhost:${PORT}`));
