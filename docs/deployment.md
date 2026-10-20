# Implantação em produção

Arquitetura recomendada:

| Peça | Serviço | Observação |
| --- | --- | --- |
| Frontend (site + painel) | **Vercel** | build estático do Vite (`frontend/vercel.json`) |
| API | **Render** (Web Service) | `render.yaml` na raiz do repositório |
| Banco e login | **Supabase** | PostgreSQL + Auth |
| Fotos | **Cloudinary** | upload assinado e entrega otimizada |
| Domínio | ex.: `cleidesdias.com.br` (site) e `api.cleidesdias.com.br` (API) | HTTPS automático na Vercel e no Render |

> Contas necessárias: Supabase, Cloudinary, Render, Vercel e o registro do domínio (ex.: Registro.br).

## 1. Supabase

1. Crie um projeto em <https://supabase.com> (região São Paulo, se disponível).
2. **Banco:** aplique as migrations de `backend/supabase/migrations/` (veja [database.md](database.md)).
3. **Auth → Providers → Email:** mantenha e-mail/senha ativos.
4. **Auth → Sign In / Providers → desative "Allow new users to sign up"** (não há cadastro público).
5. **Auth → URL Configuration:**
   - *Site URL:* `https://cleidesdias.com.br`
   - *Redirect URLs:* `https://cleidesdias.com.br/admin/redefinir-senha` (e
     `http://localhost:5173/admin/redefinir-senha` para desenvolvimento).
6. **Auth → Emails (opcional):** traduza o modelo "Reset password" para português.
7. **Project Settings → API:** copie
   - `Project URL` → `SUPABASE_URL` (API) e `VITE_SUPABASE_URL` (frontend)
   - `anon public` → `VITE_SUPABASE_ANON_KEY` (frontend — chave pública, protegida pelas políticas RLS)
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**somente na API**; nunca no frontend nem no Git)
8. Crie a conta da administradora (localmente, com o `backend/.env` apontando para o projeto):
   ```bash
   npm run create-admin -- cleides@seuemail.com "Cleides Dias"
   ```
9. (Opcional) Conteúdo inicial de demonstração: `npm run seed`.

## 2. Cloudinary

1. Crie uma conta em <https://cloudinary.com>.
2. **Settings → API Keys:** copie `Cloud name`, `API Key` e `API Secret`.
3. Configure na API: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   (**o segredo fica somente na API**).
4. Recomendado em **Settings → Security**: restrinja "Allowed fetch domains" e ative
   "Strict transformations" se quiser bloquear transformações não previstas
   (as usadas pelo site são `f_auto,q_auto,c_limit,w_<largura>`).

Não é preciso criar *upload preset*: os uploads são assinados pela API.

## 3. API no Render

1. Em <https://render.com>, **New → Blueprint** e selecione este repositório (usa `render.yaml`).
2. Preencha as variáveis marcadas como `sync: false`:

| Variável | Valor |
| --- | --- |
| `FRONTEND_URL` | `https://cleidesdias.com.br,https://www.cleidesdias.com.br` (origens do CORS) |
| `SITE_URL` | `https://cleidesdias.com.br` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | do passo 1 |
| `CLOUDINARY_*` | do passo 2 |

3. O blueprint cria também o **cron job diário** `cleides-media-cleanup`, que remove do Cloudinary fotos
   sem uso há mais de 24h (preencha as mesmas variáveis nele).
4. Domínio próprio: **Settings → Custom Domains** → `api.cleidesdias.com.br` e crie o `CNAME` indicado
   no seu provedor de DNS. O HTTPS é emitido automaticamente.
5. Verifique: `https://api.cleidesdias.com.br/api/v1/health`.

> No plano gratuito o Render "adormece" a API sem uso (a primeira visita demora alguns segundos).
> Para um site comercial, use o plano pago mais simples.

## 4. Frontend na Vercel

1. Em <https://vercel.com>, **Add New → Project** e importe o repositório.
2. **Root Directory:** `frontend` · Framework: Vite (detectado). O build instala o monorepo
   automaticamente; se necessário, use *Install Command* `npm ci --prefix ..` e
   *Build Command* `npm run build`.
3. Variáveis de ambiente (todas públicas):

| Variável | Valor |
| --- | --- |
| `VITE_API_URL` | `https://api.cleidesdias.com.br/api/v1` |
| `VITE_SITE_URL` | `https://cleidesdias.com.br` |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | chave `anon` do Supabase |

4. Domínio: **Settings → Domains** → `cleidesdias.com.br` e `www` (siga os registros DNS indicados).
5. `frontend/vercel.json` já configura: rotas da SPA, cabeçalhos de segurança (CSP, HSTS,
   `X-Frame-Options`…) e cache longo para os arquivos com hash.

O `robots.txt` é gerado no build e aponta para o sitemap dinâmico da API
(`<VITE_API_URL>/sitemap.xml`). Cadastre o site no Google Search Console e envie esse sitemap.

## 5. Checklist de produção

- [ ] Migrations aplicadas e RLS ativo em todas as tabelas (Supabase → Table Editor mostra "RLS enabled").
- [ ] Cadastro público desativado no Supabase Auth.
- [ ] Conta da administradora criada com senha forte; recuperação de senha testada.
- [ ] `FRONTEND_URL` com exatamente os domínios do site (CORS).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` e `CLOUDINARY_API_SECRET` presentes **apenas** no Render.
- [ ] `TRUST_PROXY=1` no Render (o rate limit usa o IP real do visitante).
- [ ] Envio de foto testado pelo painel (galeria) e foto publicada visível no site.
- [ ] Número do WhatsApp conferido em **Contato e rodapé** (botão "Testar o link do WhatsApp").
- [ ] Política de privacidade revisada pelo estúdio.
- [ ] Sitemap enviado ao Google Search Console.

## 6. Logs e monitoramento

- A API grava logs estruturados (JSON, Pino) com método, rota, status e duração; cabeçalhos de
  autenticação, senhas e tokens são ocultados. Veja em **Render → Logs**.
- Erros 5xx são registrados com a pilha **apenas no log**; o cliente recebe uma mensagem genérica.
- Monitoramento de disponibilidade: aponte um serviço como UptimeRobot/Better Stack para
  `/api/v1/health` (o Render também usa essa rota como health check).
- Para rastreamento de erros, é possível integrar Sentry ao Express e ao React (não incluído para não
  adicionar dependências sem uso).

## 7. Backups

- **Banco:** o Supabase faz backups diários automáticos (retenção conforme o plano; o plano Pro permite
  restauração em ponto no tempo). Para uma cópia extra, agende `supabase db dump` (ou `pg_dump` com a
  connection string) e guarde o arquivo fora do Supabase.
- **Fotos:** ficam no Cloudinary. Mantenha os originais das sessões no arquivo do estúdio; o Cloudinary
  também permite backup automático para outro armazenamento nos planos pagos.
- **Código e migrations:** versionados no GitHub.

## 8. Atualizações

- Mudanças no banco: crie uma nova migration (`npx supabase migration new <nome>`), teste localmente
  e aplique com `npx supabase db push` **antes** de publicar a nova versão da API.
- O CI (`.github/workflows/ci.yml`) roda lint, tipos, testes, build e E2E em cada push.

## API na VPS Hostinger (alternativa ao Render, em uso)

A API roda na VPS `72.60.243.98` junto com outros projetos; o `render.yaml` foi removido.

- Pasta: `/opt/projetos-borges/cleides-dias` (usuário `cleides`), segredos em `.env` nessa pasta (modo 600). Os segredos do Supabase e do Cloudinary ficam **só** na VPS; a Vercel recebe apenas variáveis `VITE_*` públicas.
- Serviço: `systemctl status cleides-api` (porta 4000, `TRUST_PROXY=2`: Vercel + nginx). Logs: `journalctl -u cleides-api -f`.
- nginx: `https://srv1388438.hstgr.cloud/cleides/` → `127.0.0.1:4000/`. O `frontend/vercel.json` repassa `/api/*` para `/cleides/api/*`, então o navegador usa o mesmo domínio da Vercel (sem CORS) e `VITE_API_URL=/api/v1`.
- Limpeza de mídia: `cleides-media-cleanup.timer` (diário, 06:15), substitui o cron do Render.
- Deploy: `./deploy.sh` (após commit) ou o workflow `Deploy API` (usa o segredo `VPS_DEPLOY_KEY`). A chave só executa `/usr/local/bin/deploy-cleides-dias` (instala, builda e reinicia).
