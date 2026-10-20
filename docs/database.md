# Banco de dados (Supabase PostgreSQL)

As migrations ficam em `backend/supabase/migrations/` e seguem o formato do Supabase CLI
(`<timestamp>_<nome>.sql`). As migrations são validadas automaticamente nos testes
(`backend/test/migrations.test.ts`) em um PostgreSQL real (PGlite), incluindo as políticas RLS.

## Tabelas

| Tabela | Conteúdo |
| --- | --- |
| `profiles` | Perfis administrativos (`id` = usuário do Supabase Auth, `role = 'admin'`). Criados apenas pelo script `create-admin`. |
| `site_settings` | Linha única (`id = 1`): marca, WhatsApp, telefone, Instagram, cidade, e-mail, redes sociais, mensagens do WhatsApp, rótulos do menu, rodapé, SEO, logotipo e imagem de compartilhamento. |
| `site_sections` | Conteúdo de cada seção (`hero`, `about`, `packages`, `gallery`, `how`, `lots`, `faq`, `contact`, `legal`) em `jsonb`, validado pelos schemas de `@cleides/shared`. |
| `packages` | Pacotes: slug, nome, subtítulo, descrição, categoria, preço, preço promocional, destaques (`jsonb`), itens incluídos (`text[]`), informações adicionais, capa e fotos (`jsonb`), destaque, status e posição. |
| `gallery_images` | Fotos da galeria: arquivo (`asset_id` → `media_assets`), título, descrição, categoria (álbum), texto alternativo, enquadramento (ponto focal, zoom, formato), status e posição. |
| `faq_items` | Perguntas e respostas, categoria opcional, status e posição. |
| `process_steps` | Etapas do "Como funciona": título, descrição, texto complementar, ícone, imagem opcional, status e posição. |
| `price_lots` | Valores por lote: nome, último dia do lote (`ends_on`, único), valores de cada pacote (`prices` em `jsonb`: `[{ packageId, price }]`), status e posição. O lote começa no dia seguinte ao fim do anterior; a API decide o lote atual pela data no fuso de São Paulo. |
| `media_assets` | Arquivos do Cloudinary: `public_id`, finalidade, status (`pending` → `active` → `deleted`), URL, formato, dimensões e tamanho. |

Todas as tabelas de conteúdo têm `created_at`/`updated_at` (atualizado por trigger), `status`
(`publication_status`: `draft` | `published`) e `position` quando ordenáveis.

## Integridade

- Restrições de tamanho em todos os textos e de faixa nos números (zoom 1–2,5; ponto focal 0–100).
- `packages`: preço promocional menor que o preço; pacote publicado exige preço; slug único e válido.
- `site_settings.whatsapp_number`: vazio ou `55` + DDD + número.
- `media_assets`: arquivo ativo exige URL HTTPS, formato (`jpg`/`png`/`webp`) e dimensões.
- `gallery_images.asset_id` → `media_assets.id` com `ON DELETE RESTRICT` (não é possível apagar um
  arquivo em uso).
- `price_lots`: um lote por dia de encerramento; `prices` precisa ser uma lista.
- Índices em `(status, position)` de cada coleção, categoria da galeria e status/data dos arquivos.

## Funções

- `is_admin()` — `security definer`, usada pelas políticas RLS.
- `reorder_rows(tabela, ids[])` — grava a nova ordem de uma coleção em uma única operação; só aceita as
  tabelas ordenáveis e só pode ser executada pela `service_role`.
- `set_updated_at()` — trigger de atualização de datas.

## Row Level Security

RLS está habilitada em **todas** as tabelas. A API usa a `service_role` (que ignora RLS); as políticas
protegem os dados caso alguém use a chave pública (`anon`) diretamente:

| Tabela | Visitante (`anon`) | Autenticado sem perfil admin | Administradora |
| --- | --- | --- | --- |
| `packages`, `gallery_images`, `faq_items`, `process_steps` | lê só `published` | lê só `published` | lê e escreve tudo |
| `site_settings`, `site_sections` | lê | lê | lê e escreve |
| `media_assets` | lê só ativos | lê só ativos | lê e escreve |
| `profiles` | — | lê o próprio perfil | lê o próprio perfil |

Não há políticas de escrita em `profiles`: perfis só são criados pela `service_role`.

## Aplicar as migrations

**Com o Supabase CLI** (recomendado, controla o histórico):

```bash
cd backend
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

**Pelo painel:** abra *SQL Editor* no Supabase, cole o conteúdo de cada arquivo de
`backend/supabase/migrations/` em ordem e execute.

Para evoluir o banco, crie um novo arquivo com timestamp maior (`npx supabase migration new <nome>`)
— nunca edite uma migration já aplicada em produção.

## Dados de demonstração

`npm run seed` insere o conteúdo dos mockups (textos, 3 pacotes, 7 perguntas, 4 etapas e a foto da
fotógrafa). O seed **não sobrescreve dados reais**: coleções só são preenchidas se estiverem vazias,
seções só se ainda não existirem e as configurações só se o contato ainda não tiver sido preenchido.
