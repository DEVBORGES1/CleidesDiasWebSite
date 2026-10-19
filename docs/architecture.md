# Arquitetura

## Visão geral

```
                ┌────────────────────────────┐
 Visitante ───▶ │  Frontend (Vercel)         │  React + Vite (SPA)
 Administradora │  site público  /           │
                │  painel        /admin      │──┐ login (somente autenticação)
                └─────────────┬──────────────┘  │
                              │ HTTPS/JSON      ▼
                              │          ┌──────────────┐
                              ▼          │ Supabase Auth │
                ┌────────────────────────┴─────┐        │
                │  API REST (Render)           │◀───────┘ valida o token a cada requisição
                │  Express /api/v1             │
                │  controllers → services →    │──────────▶ Supabase PostgreSQL (service role, RLS)
                │  repositories                │──────────▶ Cloudinary Admin API (confirmar/excluir)
                └──────────────────────────────┘
                              ▲ assinatura           Navegador ──upload direto──▶ Cloudinary
```

- O **frontend nunca acessa o banco**. Todo dado passa pela API própria (`frontend/src/services`).
  O cliente do Supabase no navegador é usado **apenas para login** (e é carregado sob demanda, só no
  painel e na pré-visualização, para não pesar no site dos visitantes).
- A **API** é a única porta de entrada para regras de negócio. Ela usa a `service_role` do Supabase,
  que fica exclusivamente no servidor.
- O **Cloudinary** armazena e entrega as fotos. O navegador envia o arquivo direto ao Cloudinary
  usando parâmetros assinados pela API, e a API confirma o arquivo antes de liberá-lo.

## Monorepo

| Pacote | Papel |
| --- | --- |
| `@cleides/shared` | Contratos: schemas Zod (validação), tipos TypeScript, constantes e utilitários. A entrada `@cleides/shared/utils` não depende do Zod e é a usada em tempo de execução pelo site público. |
| `@cleides/backend` | API REST, migrations, seed e scripts administrativos. |
| `@cleides/frontend` | Site público e painel administrativo. |

Os mesmos schemas validam o payload no backend e tipam os formulários no frontend, evitando divergências.

## Backend em camadas

| Camada | Responsabilidade | Exemplo |
| --- | --- | --- |
| `routes/` | Mapeia URL → handler e aplica middlewares | `adminRoutes()` aplica `requireAdmin` em tudo |
| `controllers/` | Lê parâmetros, chama o service e formata a resposta | `adminController().packages.create` |
| `services/` | Regras de negócio | slug estável após publicar, preço obrigatório para publicar, reordenação consistente, ciclo de vida das imagens |
| `repositories/` | Persistência | `SupabasePackages` (produção) e `MemoryPackages` (testes/desenvolvimento) com a mesma interface |
| `integrations/` | Serviços externos atrás de interfaces | `AuthProvider` (Supabase Auth) e `MediaStorage` (Cloudinary) |
| `middlewares/` | Autenticação, erros, cache, limites | respostas de erro padronizadas e sem detalhes internos |

As dependências são montadas em `container.ts`. Nos testes, `createServices()` recebe repositórios em
memória e dublês de autenticação e armazenamento.

## Fluxos principais

### Autenticação e autorização

1. A administradora faz login no painel (Supabase Auth, e-mail e senha). Não existe cadastro público.
2. Cada chamada administrativa envia `Authorization: Bearer <token>`.
3. A API valida o token **no Supabase Auth** (`auth.getUser`) — tokens revogados deixam de valer — e
   confirma, na tabela `profiles`, que o usuário tem `role = 'admin'`. Papéis enviados pelo navegador
   são ignorados.
4. As políticas RLS reforçam a regra: mesmo com a chave pública, visitantes só leem conteúdo
   publicado e apenas administradores escrevem.

### Upload de imagens (assinado)

1. O painel pede `POST /admin/uploads/signature` informando a finalidade (galeria, pacote, seção…).
2. A API gera o `public_id` (`cleides/<finalidade>/<uuid>`), assina os parâmetros com o `API_SECRET`
   (formatos permitidos, `overwrite=false`, limite de 3000 px) e registra o upload como **pendente**.
3. O navegador envia o arquivo direto ao Cloudinary, exibindo o progresso.
4. O painel chama `POST /admin/uploads/confirm`. A API **consulta o arquivo na API do Cloudinary**
   (a URL enviada pelo navegador nunca é usada), valida formato, tamanho e dimensões e marca o arquivo
   como **ativo**. Arquivos inválidos são excluídos.
5. O conteúdo (pacote, galeria, seção) referencia o arquivo pelo `assetId`; URL e dimensões são
   preenchidas pelo servidor.

**Falhas parciais e órfãos:** uploads nunca confirmados e fotos substituídas/sem uso ficam guardados por
24 horas (permite desfazer) e depois são removidos pela limpeza (`npm run media:cleanup`, agendada no
Render). Ao excluir ou substituir uma foto da galeria, o arquivo antigo é removido na hora se não estiver
em uso em outro lugar (por exemplo, como capa do site). Se a exclusão no Cloudinary falhar, ela é
tentada de novo na próxima limpeza.

### Publicação e sincronização com o site

- Pacotes, fotos, perguntas e etapas têm status **rascunho** ou **publicado**. Os endpoints públicos
  retornam apenas o que está publicado; despublicar não apaga os dados.
- Textos e imagens das seções e as configurações são publicados ao salvar.
- O site busca tudo em uma requisição (`GET /api/v1/site`). As respostas públicas usam
  `Cache-Control: public, max-age=0, must-revalidate` com ETag: as edições aparecem imediatamente e
  respostas repetidas custam um `304`.
- Seções sem itens publicados somem automaticamente do site e do menu.

### Pré-visualização protegida

- `/?preview=1` (ou o botão **Visualizar**) mostra o site com os rascunhos marcados, usando
  `GET /api/v1/admin/preview`, que exige login de administradora. Visitantes que abrirem o endereço
  veem apenas o conteúdo publicado.
- A prévia ao lado do editor é um `iframe` do próprio site. O painel avisa o iframe (via `postMessage`
  restrito à mesma origem) para recarregar os dados após salvar, rolar até a seção editada e, no modo
  **Selecionar**, abrir o editor da parte clicada.

## Frontend

- **Roteamento:** `createBrowserRouter`. O painel (`/admin/*`) é carregado sob demanda (code splitting).
- **Dados:** TanStack Query (cache, revalidação e invalidação após edições).
- **Formulários do painel:** cópia local (`useDraft`) com indicador "Alterações não salvas", botões
  **Salvar/Descartar** no topo, atalho `Ctrl+S` e aviso ao sair da página sem salvar.
- **Estilos:** CSS Modules com os valores dos mockups (paleta, tipografia Playfair Display + Montserrat,
  ícones Material Symbols — carregados como subconjunto com apenas os ícones usados).
- **Imagens:** `<img>` com `srcset` do Cloudinary, `loading="lazy"` e enquadramento (ponto focal e zoom)
  definido no painel.
- **Acessibilidade:** HTML semântico, link "pular para o conteúdo", foco visível, diálogos com foco
  preso e `Esc`, acordeão com `aria-expanded`, textos alternativos editáveis, `prefers-reduced-motion`.
- **SEO:** título/descrição por página, canonical, Open Graph, `robots.txt` gerado no build e sitemap
  dinâmico servido pela API (`/api/v1/sitemap.xml`), página 404 com `noindex`.

## Decisões técnicas

| Decisão | Motivo |
| --- | --- |
| Seções e configurações em JSON validado por Zod (`site_sections`, colunas JSON de `site_settings`) | São textos semiestruturados que mudam com o design; o schema compartilhado garante o formato sem migrations a cada novo texto. Campos críticos (WhatsApp, nome) são colunas com restrições no banco. |
| Destaques e itens incluídos dos pacotes em `jsonb`/`text[]` (sem tabela `package_features`) | São valores próprios do pacote, sempre lidos e gravados juntos; uma tabela separada não traria ganho de integridade e complicaria a edição. |
| Reordenação via função SQL `reorder_rows` | Atualiza todas as posições em uma única operação atômica. |
| Repositórios em memória além do Supabase | Testes rápidos e determinísticos e um modo de demonstração local sem contas externas (bloqueado em produção). |
| Slug do pacote estável depois de publicado | Evita quebrar links já compartilhados no WhatsApp/Instagram. |
| Supabase Auth carregado sob demanda e `@supabase/auth-js` em vez do SDK completo | O site dos visitantes não precisa de login; o bundle público ficou ~40% menor. |
| Sem "status de site em manutenção" ou métricas de vendas | O sistema não possui dados para isso; o painel mostra apenas contagens reais, rascunhos pendentes e seções visíveis. |
| Logotipo opcional | O design usa ícone + nome; se um logotipo for enviado, ele substitui o ícone no topo. |

## Limitações conhecidas

- A prévia do painel em celular é ocultada em telas estreitas (o botão **Visualizar** abre a prévia em
  outra aba).
- A política de privacidade de demonstração é um modelo e precisa ser revisada pelo estúdio.
