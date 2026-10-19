import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureAuth, request } from './http';

const json = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => vi.unstubAllGlobals());

describe('cliente HTTP', () => {
  it('retorna o envelope de sucesso', async () => {
    vi.stubGlobal('fetch', json(200, { data: { ok: true } }));
    await expect(request('/site')).resolves.toEqual({ data: { ok: true } });
  });

  it('converte erros da API em ApiError com detalhes por campo', async () => {
    vi.stubGlobal(
      'fetch',
      json(400, { error: { code: 'VALIDATION_ERROR', message: 'Confira os campos destacados.', details: [{ path: 'price', message: 'Informe o preço.' }] } }),
    );
    const err = await request('/admin/packages', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.field('price')).toBe('Informe o preço.');
  });

  it('envia o token nas rotas autenticadas e avisa quando a sessão expira', async () => {
    const fetchMock = json(401, { error: { code: 'UNAUTHENTICATED', message: 'Sessão expirada.' } });
    vi.stubGlobal('fetch', fetchMock);
    const unauthorized = vi.fn();
    configureAuth(async () => 'token-123', unauthorized);
    await expect(request('/admin/me', { auth: true })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer token-123');
    expect(unauthorized).toHaveBeenCalled();
  });

  it('não chama a API autenticada sem sessão', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    configureAuth(async () => null, () => {});
    await expect(request('/admin/me', { auth: true })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trata falhas de rede com mensagem amigável', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/site')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('aceita 204 sem corpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    configureAuth(async () => 't', () => {});
    await expect(request('/admin/faq/1', { method: 'DELETE', auth: true })).resolves.toEqual({ data: undefined });
  });
});
