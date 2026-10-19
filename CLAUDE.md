# Cleides Dias Fotografia — instruções do projeto

## Regras de Git (obrigatórias)

- **Autoria:** todo commit é feito **somente em nome de João Vitor**
  (`João Vitor <joaovitorpereira.10112@gmail.com>`).
  - Não adicionar `Co-Authored-By`, `Claude-Session` nem qualquer outra linha de
    coautoria/atribuição nas mensagens de commit ou descrições de PR.
  - Antes de commitar, confira `git config user.name` e `git config user.email`.
- **Branches:** nunca criar branches com prefixo `claude/`.
  Quando for necessário criar uma branch, use o padrão
  `feat/<descricao-curta>` para funcionalidades e `fix/<descricao-curta>` para correções
  (também valem `docs/`, `chore/`, `refactor/`, `test/`).
- **Commits frequentes:** toda nova mudança deve ser commitada. Mensagens no padrão
  Conventional Commits, em português: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`.
- O hook `.githooks/commit-msg` remove automaticamente linhas de coautoria do Claude.
  Ele é ativado por `npm install` (script `prepare`) ou manualmente com
  `git config core.hooksPath .githooks`.

## Visão geral

Monorepo com workspaces npm:

- `shared/` — contratos (schemas Zod e tipos TypeScript) usados pelo backend e pelo frontend.
- `backend/` — API REST (Node.js + Express + TypeScript), Supabase (PostgreSQL/Auth) e Cloudinary.
- `frontend/` — site público e painel administrativo (React + Vite + TypeScript + React Router).
- `backend/supabase/migrations/` — migrations SQL versionadas do Supabase.
- `e2e/` — testes ponta a ponta e serviços simulados (Supabase Auth e Cloudinary).
- `docs/` — arquitetura, banco de dados, API e implantação.

## Comandos

```bash
npm install            # instala tudo e ativa os hooks de git
npm run dev            # backend (porta 4000) + frontend (porta 5173)
npm run e2e:stack      # demonstração local sem contas externas (dados em memória)
npm test               # testes de todos os workspaces
npm run test:e2e       # testes ponta a ponta (Playwright)
npm run typecheck      # checagem de tipos
npm run lint           # ESLint
npm run build          # build de produção
```

## Convenções de código

- Regras de negócio ficam nos *services* do backend; controllers são enxutos.
- O frontend nunca acessa o banco diretamente: usa a API (`frontend/src/services`).
  O cliente Supabase do frontend serve apenas para autenticação.
- Segredos (`SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`) só existem no backend.
- Textos da interface em português do Brasil.
- Runtime do site público importa utilitários de `@cleides/shared/utils` (sem Zod) para manter o bundle leve;
  tipos podem vir de `@cleides/shared` com `import type`.
- Ao usar um ícone novo do Material Symbols, inclua o nome na lista `icon_names` em `frontend/index.html`.
