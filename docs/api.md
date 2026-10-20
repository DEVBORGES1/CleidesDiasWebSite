# API REST

Base: `https://<sua-api>/api/v1` — JSON em todas as respostas.

## Convenções

**Sucesso**

```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "page": 1, "limit": 100, "total": 12, "totalPages": 1 } }
```

**Erro**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Confira os campos destacados.",
    "details": [{ "path": "price", "message": "Informe o preço para publicar." }]
  }
}
```

| HTTP | `code` | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Parâmetros, query ou corpo inválidos (JSON malformado incluso) |
| 401 | `UNAUTHENTICATED` | Sem token, token inválido ou expirado |
| 403 | `FORBIDDEN` | Usuário autenticado sem perfil de administradora |
| 404 | `NOT_FOUND` | Registro ou rota inexistente (rascunhos são 404 nas rotas públicas) |
| 409 | `CONFLICT` | Limite de itens atingido; arquivo em uso |
| 413 | `PAYLOAD_TOO_LARGE` | Corpo maior que 200 KB |
| 422 | `UPLOAD_INVALID` | Arquivo não chegou ao Cloudinary ou é inválido (formato, tamanho, dimensões) |
| 429 | `RATE_LIMITED` | Limite de requisições |
| 503 | `SERVICE_UNAVAILABLE` | Cloudinary não configurado ou Auth indisponível |
| 500 | `INTERNAL_ERROR` | Erro inesperado (detalhes apenas no log do servidor) |

**Autenticação:** rotas `/admin/*` exigem `Authorization: Bearer <access_token do Supabase Auth>` de um
usuário com perfil de administradora. Respostas administrativas usam `Cache-Control: no-store`.

**Limites:** 600 requisições/15 min por IP na API; 240 escritas/5 min no painel; 120 assinaturas de
upload/15 min.

**Cache público:** `Cache-Control: public, max-age=0, must-revalidate` + ETag.

## Endpoints públicos (somente conteúdo publicado)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Verificação de saúde |
| GET | `/site` | Tudo para a página inicial: `settings`, `sections`, `packages`, `gallery`, `faq`, `steps`, `lots` (com a fase de cada lote: `ended`, `current` ou `upcoming`; vazio quando nenhum lote está valendo) e `today` |
| GET | `/settings` | Configurações gerais |
| GET | `/packages` | Pacotes publicados, na ordem definida |
| GET | `/packages/:idOrSlug` | Um pacote publicado |
| GET | `/gallery?category=&page=&limit=` | Fotos publicadas (paginado, `limit` até 200) |
| GET | `/gallery/categories` | Categorias com fotos publicadas |
| GET | `/faq?q=&category=` | Perguntas publicadas (busca sem acentos) |
| GET | `/how-it-works` | Textos da seção e etapas publicadas |
| GET | `/lots` | Textos da seção "Valores por lote", lotes publicados com fase e `today` |
| GET | `/about` | Seção "Sobre" |
| GET | `/sitemap.xml` | Sitemap (início, pacotes publicados, privacidade) |

## Endpoints administrativos

### Sessão e visão geral

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin/me` | Perfil da administradora logada |
| GET | `/admin/dashboard` | Contagens, rascunhos pendentes, seções visíveis, fotos sem uso |
| GET | `/admin/preview` | Igual a `/site`, incluindo rascunhos (`preview: true`) |

### Pacotes

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin/packages?status=` | Todos os pacotes |
| POST | `/admin/packages` | Cria (rascunho por padrão) |
| GET | `/admin/packages/:id` | Detalhe |
| PATCH | `/admin/packages/:id` | Atualização parcial |
| DELETE | `/admin/packages/:id` | Exclui (e remove fotos usadas só nele) |
| POST | `/admin/packages/:id/duplicate` | Cópia em rascunho logo após o original |
| POST | `/admin/packages/:id/publish` · `/unpublish` | Publica / despublica |
| PUT | `/admin/packages/order` | `{ "ids": [...] }` com todos os pacotes na nova ordem |

Exemplo de criação:

```json
{
  "name": "Natal Completo",
  "subtitle": "A experiência perfeita para registrar mais momentos.",
  "price": "590,00",
  "promoPrice": null,
  "highlights": [{ "type": "duracao", "value": "Até 1 hora" }],
  "includedItems": ["10 fotos digitais em alta resolução"],
  "cover": { "assetId": "<uuid do arquivo confirmado>", "x": 50, "y": 40, "zoom": 1, "alt": "Família no cenário" },
  "coverOnCard": false,
  "featured": true,
  "status": "published"
}
```

Regras: nome obrigatório; preço obrigatório para publicar; promocional menor que o preço; o slug é
gerado do nome e não muda depois de publicado.

### Galeria

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin/gallery?status=&category=&page=&limit=` | Fotos (paginado) |
| POST | `/admin/gallery` | `{ assetId, title, category, alt, x, y, zoom, ratio, status }` |
| PATCH | `/admin/gallery/:id` | Atualiza; enviar `assetId` substitui a foto mantendo título/posição |
| DELETE | `/admin/gallery/:id` | Exclui a foto e o arquivo (se não estiver em uso) |
| POST | `/admin/gallery/status` | `{ ids, status }` publica/despublica várias |
| PUT | `/admin/gallery/order` | Nova ordem |
| POST | `/admin/gallery/:id/cover` | Usa a foto como imagem de destaque da capa |
| GET | `/admin/gallery/categories` | Categorias (álbuns) existentes |

### Dúvidas frequentes e etapas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET/POST | `/admin/faq` | Lista (`?q=&category=&status=`) / cria `{ question, answer, category, status }` |
| GET/PATCH/DELETE | `/admin/faq/:id` | Detalhe / atualiza / exclui |
| PUT | `/admin/faq/order` | Nova ordem |
| GET/POST | `/admin/steps` | Lista / cria `{ title, description, note, icon, image, status }` |
| GET/PATCH/DELETE | `/admin/steps/:id` | Detalhe / atualiza / exclui |
| POST | `/admin/steps/:id/duplicate` | Cópia em rascunho |
| PUT | `/admin/steps/order` | Nova ordem |
| GET/POST | `/admin/lots` | Lista (por data de encerramento) / cria `{ name, endsOn: 'AAAA-MM-DD', prices: [{ packageId, price }], status }` |
| GET/PATCH/DELETE | `/admin/lots/:id` | Detalhe / atualiza / exclui |

A resposta das perguntas aceita texto simples: linha em branco separa parágrafos e linhas iniciadas
por `- ` viram listas.

### Seções e configurações

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin/sections` | Todas as seções |
| PATCH | `/admin/sections/:key` | Atualização parcial de `hero`, `about`, `packages`, `gallery`, `how`, `faq`, `contact` ou `legal` |
| PATCH | `/admin/about` | Atalho para a seção "Sobre" |
| GET/PATCH | `/admin/settings` | Configurações gerais (atualização parcial) |

Os campos de cada seção estão em `shared/src/sections.ts`; os das configurações, em
`shared/src/settings.ts`.

### Mídia (Cloudinary)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin/media/status` | `{ enabled }` — se o Cloudinary está configurado |
| POST | `/admin/uploads/signature` | `{ purpose: "gallery" \| "package" \| "section" \| "step" \| "brand" }` → parâmetros assinados |
| POST | `/admin/uploads/confirm` | `{ publicId }` → arquivo confirmado (`id`, `url`, `width`, `height`…) |
| DELETE | `/admin/media/:id` | Descarta um arquivo não utilizado |
| POST | `/admin/media/cleanup` | Remove uploads abandonados e fotos sem uso há mais de 24h |

Envio pelo navegador (após a assinatura):

```js
const form = new FormData();
form.append('file', arquivo);
form.append('api_key', sig.apiKey);
form.append('signature', sig.signature);
for (const [k, v] of Object.entries(sig.params)) form.append(k, v);
await fetch(sig.uploadUrl, { method: 'POST', body: form });
// depois: POST /admin/uploads/confirm { publicId: sig.publicId }
```
