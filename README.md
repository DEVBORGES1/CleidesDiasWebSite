# Cleides Dias Fotografia — site e painel administrativo

Site profissional da **Cleides Dias Fotografia** (Videira – SC) com um **painel administrativo próprio (CMS)**
para que a fotógrafa gerencie pacotes, galeria, dúvidas frequentes, etapas do atendimento, textos e
contatos — sem mexer em código.

O visual reproduz fielmente os dois mockups aprovados no Claude Design (site público e painel).

| Área | Endereço | O que faz |
| --- | --- | --- |
| Site público | `/` | Capa, pacotes (com detalhes em `/pacotes/:slug`), galeria com foto ampliada, sobre, como funciona, dúvidas, contato |
| Política de privacidade | `/privacidade` | Texto editável pelo painel |
| Painel | `/admin` | Login, visão geral, edição de todo o conteúdo e prévia ao vivo |

## Stack

- **Frontend:** React 19 + TypeScript + Vite 8 + React Router 8 + TanStack Query, CSS Modules.
- **Backend:** Node.js 22 + TypeScript + Express 5 (API REST em `/api/v1`), Zod, Helmet, CORS, rate limit, Pino.
- **Banco e login:** Supabase (PostgreSQL com RLS + Supabase Auth), migrations SQL versionadas.
- **Imagens:** Cloudinary com upload assinado pelo backend e entrega otimizada (`f_auto`, `q_auto`, `srcset`).
- **Contratos compartilhados:** pacote `@cleides/shared` (schemas Zod e tipos usados pelo backend e pelo frontend).
- **Testes:** Vitest + Supertest (API), PGlite (migrations e RLS em PostgreSQL real), Testing Library e Playwright (E2E).

## Estrutura

```
├── shared/                 # contratos: schemas Zod, tipos e utilitários
├── backend/
│   ├── src/
│   │   ├── config/         # variáveis de ambiente e logger
│   │   ├── routes/         # rotas públicas e administrativas
│   │   ├── controllers/    # camada HTTP enxuta
│   │   ├── services/       # regras de negócio
│   │   ├── repositories/   # acesso a dados (Supabase e memória)
│   │   ├── integrations/   # Supabase Auth e Cloudinary
│   │   ├── middlewares/    # autenticação, erros, cache, rate limit
│   │   └── seed/           # conteúdo de demonstração
│   ├── supabase/migrations # migrations SQL versionadas
│   ├── scripts/            # seed, criar administradora, limpeza de mídia
│   └── test/               # testes de integração e das migrations
├── frontend/
│   └── src/
│       ├── components/     # site/ (seções do site) e admin/ (componentes do painel)
│       ├── pages/          # public/ e admin/
│       ├── layouts/        # layout do painel
│       ├── services/       # cliente HTTP, API e uploads (única porta para o backend)
│       ├── contexts/       # autenticação e utilidades do painel
│       └── hooks/
├── e2e/                    # testes ponta a ponta + serviços simulados (Auth/Cloudinary)
└── docs/                   # arquitetura, banco, API e implantação
```

## Executar localmente

Pré-requisito: **Node.js 22.22+** (veja `.nvmrc`).

```bash
npm install
```

### Opção A — demonstração sem contas externas (recomendado para conhecer)

Sobe a API com dados em memória (com o conteúdo de demonstração), o frontend e serviços simulados de
login e de imagens:

```bash
npm run e2e:stack
```

- Site: <http://localhost:5173>
- Painel: <http://localhost:5173/admin> — e-mail `cleides@example.com`, senha `senha-segura-123`

> Os dados ficam só na memória e somem ao parar o processo. Esse modo existe apenas para
> desenvolvimento e testes; a API recusa `DATA_DRIVER=memory` em produção.

### Opção B — com Supabase e Cloudinary reais

1. Crie os serviços seguindo [docs/deployment.md](docs/deployment.md) (Supabase, migrations, Cloudinary).
2. Copie e preencha as variáveis:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
3. Crie a conta de administradora e (opcionalmente) o conteúdo de demonstração:
   ```bash
   npm run create-admin -- cleides@exemplo.com "Cleides Dias"
   npm run seed
   ```
4. Rode tudo:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | API (porta 4000) + frontend (porta 5173) com recarga automática |
| `npm run e2e:stack` | Pilha completa de demonstração/testes, sem contas externas |
| `npm test` | Testes unitários e de integração de todos os pacotes |
| `npm run test:e2e` | Testes ponta a ponta (Playwright) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` | Build de produção (shared, backend e frontend) |
| `npm run seed` | Insere o conteúdo de demonstração sem sobrescrever dados reais |
| `npm run create-admin -- email "Nome"` | Cria/promove a conta de administradora |
| `npm run media:cleanup -w @cleides/backend` | Remove do Cloudinary fotos sem uso há mais de 24h |

## Documentação

- [Arquitetura e decisões técnicas](docs/architecture.md)
- [Banco de dados, migrations e RLS](docs/database.md)
- [API REST](docs/api.md)
- [Implantação em produção (Supabase, Cloudinary, Render, Vercel, domínio, backups)](docs/deployment.md)

## Regras de contribuição

Veja [CLAUDE.md](CLAUDE.md): commits somente em nome de João Vitor, sem coautoria, branches no padrão
`feat/...` e `fix/...` e um commit para cada mudança.
