# Auditoria de produção — 20/10/2026

Escopo: repositório inteiro (`shared`, `backend`, `frontend`, `e2e`, migrations, CI/CD, docs) e
verificações **somente de leitura** no ambiente publicado (`estudiocleidesdias.vercel.app` e API na VPS).
Nenhum dado real foi alterado. Nenhuma credencial foi impressa ou modificada.

## 1. Resumo executivo

O projeto está bem estruturado e com boa base de segurança: autorização feita no servidor em todas as
rotas do painel, papéis lidos do banco (nunca do navegador), validação Zod com limites em todas as
entradas, RLS ativo e coerente, uploads assinados e confirmados no Cloudinary, logs com redação de
segredos e erros 5xx sem detalhes internos. Lint, tipos, 107 testes unitários/integração, build,
`npm audit` e 17 testes E2E passam.

Não foram encontradas vulnerabilidades críticas (P0) nem altas (P1). Os problemas reais encontrados
eram de SEO (sitemap inacessível pelo endereço padrão, `robots.txt` inválido, ausência de Open Graph
para WhatsApp), robustez (sem tempo limite nas chamadas externas) e acessibilidade (contraste
ligeiramente abaixo do AA). Todos foram corrigidos e validados localmente. Restam pendências de
infraestrutura (rate limit contornável chamando a VPS diretamente, backups não testados, monitoramento
externo) que dependem de acesso à VPS e às contas.

**Avaliação final: pronto para produção, com ressalvas** (ver seção 8).

## 2. Inventário

| Item | Situação |
| --- | --- |
| Monorepo npm | `shared` (Zod 4 + tipos), `backend` (Express 5, TS 6, Pino, Helmet, express-rate-limit), `frontend` (React 19, Vite 8, React Router 8, TanStack Query 5) |
| Node | `.nvmrc` 22.22.0, `engines >=22.22.0` |
| Banco | Supabase PostgreSQL, 2 migrations (`initial_schema`, `price_lots`), RLS em todas as tabelas |
| Auth | Supabase Auth (e-mail/senha, PKCE), perfil `admin` na tabela `profiles`; cadastro público desativado (verificado em produção) |
| Imagens | Cloudinary com upload assinado; entrega com `f_auto,q_auto,c_limit,w_*` e `srcset` |
| Hospedagem | Frontend na Vercel; API na VPS Hostinger (nginx → Node, systemd); `/api/*` repassado pela Vercel |
| CI/CD | GitHub Actions: lint, tipos, testes, build, E2E; deploy da API via SSH após CI verde na `main` |
| Rotas públicas | `/`, `/pacotes/:slug`, `/privacidade`, 404 |
| Rotas do painel | `/admin/*` (carregado sob demanda) |
| API | 11 rotas públicas (`/api/v1/*`) e 50 rotas do painel (`/api/v1/admin/*`) |
| Segredos | Somente na VPS (`.env` 600). `frontend/.env.production` versionado contém apenas valores públicos (`VITE_API_URL`, `VITE_SITE_URL`) |

## 3. Problemas encontrados

| ID | Grav. | Componente | Problema e evidência | Impacto | Correção / recomendação | Validação |
| --- | --- | --- | --- | --- | --- | --- |
| A-01 | P2 | `frontend/vercel.json` | `GET /sitemap.xml` em produção devolvia `text/html` (a SPA). | Buscadores não encontram o sitemap no endereço padrão. | Rewrite `/sitemap.xml` → API. | E2E `robots.txt aponta o sitemap…` (content-type XML). Efeito em produção só após deploy. |
| A-02 | P2 | `vite.config.ts` | `robots.txt` publicado com `Sitemap: /api/v1/sitemap.xml` (relativo, inválido pelo protocolo). | Diretiva ignorada. | Usa `<VITE_SITE_URL>/sitemap.xml`. | Build com `.env.production` gera URL absoluta; E2E. |
| A-03 | P2 | `index.html` | Sem Open Graph no HTML; as tags eram criadas só por JavaScript. WhatsApp/Facebook não executam JS. | Links compartilhados sem imagem e descrição. | OG padrão estático com `og-capa.jpg` 1200×630 (recorte da foto de capa já existente) + `twitter:card`. | E2E `metadados de compartilhamento…`. |
| A-04 | P3 | `index.html` | Sem `apple-touch-icon`. | Ícone genérico no iOS. | PNG 180×180 com o mesmo desenho do `favicon.svg`. | E2E. |
| A-05 | P3 | SEO | Sem dados estruturados. | Menos contexto para buscadores. | JSON-LD `ProfessionalService` só com dados cadastrados (nome, telefone, cidade, Instagram). Sem endereço, preço ou avaliações. | Teste unitário + E2E. |
| A-06 | P2 | `backend/src/container.ts`, `media-storage.ts` | Chamadas ao Supabase sem tempo limite; Cloudinary com padrão de 60s; servidor HTTP com `requestTimeout` padrão de 5 min. | Instabilidade externa prende requisições e conexões. | `fetch` com timeout de 10s no cliente Supabase, `timeout` nas chamadas ao Cloudinary, `requestTimeout` 30s / `headersTimeout` 20s. | Teste `desistem após o tempo limite…`. |
| A-07 | P2 | `global.css`, `SiteHeader.module.css` | Contraste medido: `--primary` sobre o creme 4,49:1 (mínimo 4,5); subtítulo da marca (8px) 3,55:1. | Falha WCAG 1.4.3. | `--primary` #8f6b3e → #8c693c (4,64:1; diferença imperceptível) e subtítulo com `--primary`. | Recalculado; captura de tela sem mudança visual relevante. |
| A-08 | P2 | nginx da VPS | Chamando a VPS diretamente com `X-Forwarded-For` forjado, o contador do rate limit recomeça (`r=599` com cabeçalho novo vs `r=588`). | Rate limit contornável fora da Vercel. | **Pendente (infra):** `limit_req` no nginx pelo IP real; ver `docs/deployment.md`. | Teste manual com 1 requisição GET. |
| A-09 | P3 | nginx | Cabeçalho `Server: nginx/1.24.0 (Ubuntu)`. | Divulga versão. | **Pendente:** `server_tokens off`. | — |
| A-10 | P3 | Deploy | Chave de deploy entra como `root` (com *forced command*). | Superfície maior se a chave vazar. | **Pendente:** usuário dedicado. | — |
| A-11 | P3 | CI | Sem verificação de vulnerabilidades. | Dependência vulnerável passaria. | `npm audit --audit-level=high` no CI. | `npm audit`: 0 vulnerabilidades. |
| A-12 | P3 | Testes | Nada garantia que uma rota nova do painel ficasse protegida. | Regressão silenciosa. | Teste lê `routes/index.ts` e exige 401/403 em todas as 50 rotas. | Passa. |
| A-13 | P3 | E2E | No Windows, a pilha iniciada pelo `webServer` do Playwright perde o serviço simulado e os testes travam. | Só desenvolvimento local. | Portas configuráveis (`WEB_PORT`, `API_PORT`); rodar `start-stack.sh` à parte. Causa raiz não isolada. | 17/17 passam com pilha à parte. |
| A-14 | P3 | Docs | `deployment.md` descrevia o Render como principal; faltavam rollback e restauração. | Operação confusa em incidente. | Seções de rollback, restauração, investigação de falhas e pendências do nginx. | — |
| A-15 | P3 | SPA | `/pacotes/inexistente` responde HTTP 200 (soft 404). | Mitigado: a página usa `noindex`. | Aceito; corrigir exigiria SSR/prerender. | Verificado em produção. |
| A-16 | P3 | RLS | Visitante com a chave `anon` lê `media_assets` ativos, incluindo `created_by`. | Exposição do UUID da administradora; sem impacto prático. | Recomendação: política/visão sem `created_by` em futura migration. | Consulta REST como `anon`. |

## 4. Resultados dos testes executados

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | sem erros |
| `npm run typecheck` | sem erros |
| `npm test` | shared 14, backend 76, frontend 17 — **107 passaram** |
| `npm run build` | ok (JS público 130 kB gzip; painel em chunk separado) |
| `npm audit` | 0 vulnerabilidades |
| E2E (Playwright, pilha local com serviços simulados) | **17/17 passaram** (login, CRUD de pacotes/FAQ/etapas, upload, publicação, prévia, API sem login, SEO) |
| API em produção sem token / token inválido / POST sem login | 401 em todos |
| Rascunhos em produção (`/site?preview=1` sem login) | `preview: false`, só publicados |
| CORS de origem estranha | sem cabeçalhos `Access-Control-*` |
| Supabase como `anon` | só conteúdo publicado; `profiles` vazio; cadastro público desativado |
| Responsividade (320, 375, 768, 1366, 1920 px; `/`, pacote, privacidade) | sem rolagem horizontal, 1 H1, sem salto de headings, imagens com `alt`, controles com nome |
| Vitais (laboratório, Playwright, produção) | Desktop: LCP 0,6 s, CLS 0,01. Mobile emulado (4G lenta, CPU 4×): LCP 5,7 s, CLS 0,01. Sem erros no console |

PageSpeed Insights/Lighthouse não puderam ser executados (cota anônima esgotada). Os números acima são de
**laboratório**; não há dados de usuários reais (CrUX) para este domínio. INP não foi medido.

## 5. Checklist final

Status: Aprovado · Corrigido · Pendente · Falhou · Não verificado.

| Categoria | Verificação | Status | Evidência | Ação |
| --- | --- | --- | --- | --- |
| SEO | robots.txt | Corrigido | URL absoluta no build | Publicar |
| SEO | sitemap.xml | Corrigido | Rewrite + E2E | Publicar e enviar ao Search Console |
| SEO | title/description por página | Aprovado | `Seo` por rota; E2E | — |
| SEO | Open Graph | Corrigido | Tags estáticas + dinâmicas | Testar no depurador do Facebook após deploy |
| SEO | Favicon / ícones | Corrigido | SVG + apple-touch-icon | — |
| SEO | Canonical | Aprovado | Por rota; E2E | — |
| SEO | Headings | Aprovado | 1 H1, sem saltos | — |
| SEO | Alt das imagens | Aprovado | 0 imagens sem `alt` | — |
| SEO | Links internos | Aprovado | E2E de navegação | — |
| SEO | Página 404 | Aprovado (ressalva) | `noindex`, HTTP 200 (A-15) | — |
| SEO | HTTPS / HSTS | Aprovado | Cabeçalhos em produção | — |
| SEO | Indexabilidade | Aprovado | Sem `noindex` indevido; `/admin` bloqueado | — |
| SEO | Dados estruturados | Corrigido | JSON-LD | Validar no Rich Results Test após deploy |
| Segurança | Segredos fora do repositório | Aprovado | `.gitignore`; histórico só com `.env.example` e `.env.production` público | — |
| Segurança | Segredos no histórico Git | Aprovado | Busca por arquivos/strings sensíveis | — |
| Segurança | Autenticação | Aprovado | Token validado no Supabase a cada requisição | — |
| Segurança | Autorização no backend | Aprovado | 50 rotas testadas (A-12) | — |
| Segurança | IDOR / registros | Aprovado | Conteúdo público filtrado por status; upload amarrado ao criador | — |
| Segurança | Validação de entradas | Aprovado | Zod com limites; corpo máx. 200 kB | — |
| Segurança | XSS / injeção | Aprovado | Sem `innerHTML`; URLs restritas a https; PostgREST parametrizado; `reorder_rows` com lista fechada | — |
| Segurança | Rate limiting | Pendente | Contornável direto na VPS (A-08); login limitado pelo Supabase | nginx |
| Segurança | CORS | Aprovado | Lista explícita | — |
| Segurança | Headers | Aprovado | CSP, HSTS, XFO, nosniff, Referrer-Policy | — |
| Segurança | RLS / permissões Supabase | Aprovado | Teste com PGlite + consulta como `anon` | A-16 opcional |
| Segurança | Upload seguro | Aprovado | Assinado, formato/dimensão/tamanho validados no servidor | — |
| Segurança | Logs sem dados sensíveis | Aprovado | Redação no Pino; serializer sem cabeçalhos | — |
| Segurança | Erros seguros | Aprovado | Teste de erro 500 genérico | — |
| Segurança | Dependências | Aprovado | `npm audit` 0 | — |
| Performance | Imagens comprimidas/dimensionadas | Aprovado | Cloudinary `f_auto,q_auto` + `srcset`; locais ≤ 230 kB | — |
| Performance | Carregamento de imagens | Aprovado | `lazy` fora da dobra, capa `eager` + `fetchpriority=high` | — |
| Performance | Bundle | Aprovado | 130 kB gzip; painel e auth sob demanda | — |
| Performance | Paginação | Aprovado | Galeria com `limit ≤ 200` | — |
| Performance | N+1 | Aprovado | `/site` em consultas paralelas | — |
| Performance | Índices | Aprovado | `(status, position)` nas coleções | — |
| Performance | Cache seguro | Aprovado | Público `max-age=0` + ETag; painel `no-store` | — |
| Performance | LCP | Falhou (lab mobile) | 5,7 s em 4G lenta emulada; 0,6 s desktop | Ver passo 6 da seção 8 |
| Performance | INP | Não verificado | — | Medir com dados reais |
| Performance | CLS | Aprovado (lab) | 0,01 | — |
| Performance | Lighthouse | Não verificado | Cota da API esgotada | Rodar no Chrome DevTools |
| Performance | Console sem erros | Aprovado | 0 erros em produção | — |
| Qualidade | ESLint | Aprovado | sem erros | — |
| Qualidade | Prettier | Pendente | Não configurado; adotar reformataria o repositório inteiro | Decidir |
| Qualidade | TypeScript | Aprovado | sem erros, sem `any` | — |
| Qualidade | Build | Aprovado | ok | — |
| Qualidade | Testes automatizados | Aprovado | 107 | — |
| Qualidade | Integração | Aprovado | Supertest + PGlite | — |
| Qualidade | E2E | Aprovado | 17/17 | — |
| Qualidade | CI/CD | Corrigido | `npm audit` adicionado | — |
| Qualidade | Tratamento global de erros | Aprovado | `errorHandler`, `unhandledRejection` | — |
| Qualidade | Variáveis documentadas | Aprovado | `.env.example`, `deployment.md` | — |
| Qualidade | Migrations | Aprovado | Testadas em PGlite | — |
| Operação | Backups | Pendente | Depende do plano Supabase | Conferir plano e agendar `pg_dump` |
| Operação | Restauração testada | Não verificado | Exige autorização e projeto de teste | Executar e registrar |
| Operação | Monitoramento de disponibilidade | Pendente | Não há serviço externo configurado | UptimeRobot/Better Stack em `/api/v1/health` |
| Operação | Health check | Aprovado | `/api/v1/health` sem detalhes internos | — |
| Operação | Deploy documentado | Aprovado | `deployment.md` | — |
| Operação | Rollback documentado | Corrigido | Nova seção | — |
| Funcional | Login / logout | Aprovado | E2E | — |
| Funcional | Rotas do painel protegidas | Aprovado | E2E + API | — |
| Funcional | CRUD de pacotes | Aprovado | E2E | — |
| Funcional | Publicar / despublicar | Aprovado | E2E | — |
| Funcional | CRUD de FAQ | Aprovado | E2E | — |
| Funcional | CRUD de etapas | Aprovado | E2E (criar/duplicar) + testes de API | — |
| Funcional | Upload, troca e remoção de imagens | Aprovado | E2E + testes de API | — |
| Funcional | Persistência após recarregar | Aprovado (memória) | E2E com API em memória; Supabase real não testado com escrita | — |
| Funcional | Conteúdo público atualizado | Aprovado | E2E | — |
| Funcional | Falhas externas | Aprovado | 503 controlado, timeouts, mensagens em português | — |
| Funcional | Responsividade | Aprovado | 5 larguras | — |
| Funcional | Acessibilidade | Corrigido | Contraste; nomes acessíveis e headings ok | Teste com leitor de tela não feito |
| Funcional | Formulários validados | Aprovado | E2E (preço, arquivos) | — |
| Funcional | Estados de carregamento/erro | Aprovado | `SiteLoading`/`SiteError` | — |
| Funcional | Regressões visuais | Aprovado | Captura comparada | — |

## 6. Pendências

1. Rate limit contornável direto na VPS (A-08) e `server_tokens` (A-09).
2. Backups: confirmar plano do Supabase (Free não restaura pelo painel), agendar `pg_dump` externo e
   **testar uma restauração** num projeto de teste.
3. Cloudinary sem backup das fotos: manter originais no estúdio ou ativar backup do plano.
4. Monitoramento externo de disponibilidade e alerta (e-mail/WhatsApp).
5. LCP mobile em rede lenta (lab 5,7 s): a imagem da capa depende de JS + `/site`. Melhorar exigiria
   pré-renderizar a página inicial; não feito por mudar a arquitetura. Um teste com `preload` do `/site`
   foi descartado por gerar requisição duplicada.
6. Prettier: decisão sua (reformatar tudo de uma vez ou não adotar).
7. Usuário de deploy sem root (A-10).

## 7. Configurações externas

- **Vercel:** publicar estes commits; conferir `https://<site>/sitemap.xml` (XML) e o compartilhamento no
  WhatsApp/Facebook Sharing Debugger.
- **Google Search Console:** cadastrar o domínio e enviar `/sitemap.xml`.
- **Supabase:** Redirect URLs com o domínio final; senha forte e, se possível, MFA na conta do painel;
  conferir limites de taxa do Auth.
- **Domínio próprio:** ao trocar `estudiocleidesdias.vercel.app`, atualizar `VITE_SITE_URL`, `SITE_URL`,
  `FRONTEND_URL` e as URLs do Supabase.
- **VPS:** nginx (A-08, A-09) e usuário de deploy (A-10).

## 8. Antes de considerar 100% pronto

1. Publicar os commits desta auditoria (push na `main` dispara o deploy da API).
2. Validar em produção: `/robots.txt`, `/sitemap.xml`, prévia do link no WhatsApp, Rich Results Test.
3. Aplicar o limite no nginx.
4. Configurar monitoramento de `/api/v1/health`.
5. Fazer e registrar um teste de restauração do banco.
6. Rodar Lighthouse no Chrome (mobile) e registrar o resultado; acompanhar Core Web Vitals reais no
   Search Console depois de algumas semanas de tráfego.
