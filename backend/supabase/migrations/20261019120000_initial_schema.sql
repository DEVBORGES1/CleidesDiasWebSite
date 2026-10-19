-- =====================================================================
-- Cleides Dias Fotografia — esquema inicial
-- Tabelas de conteúdo do site, perfis administrativos, arquivos de mídia,
-- restrições de integridade, índices e políticas de Row Level Security.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos e funções utilitárias
-- ---------------------------------------------------------------------
create type public.publication_status as enum ('draft', 'published');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfis administrativos
-- Não há cadastro público: perfis são criados apenas pelo backend
-- (script `npm run create-admin`), usando a service role.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null check (role in ('admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Verifica se o usuário autenticado é administrador (usada nas políticas RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Arquivos de mídia (Cloudinary)
-- Cada upload assinado gera um registro `pending`; ele só vira `active`
-- depois que o backend confirma o arquivo diretamente na API do Cloudinary.
-- ---------------------------------------------------------------------
create table public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  public_id     text not null unique check (char_length(public_id) between 1 and 200),
  purpose       text not null check (purpose in ('gallery', 'package', 'section', 'step', 'brand')),
  status        text not null default 'pending' check (status in ('pending', 'active', 'deleted')),
  secure_url    text check (secure_url is null or secure_url like 'https://%'),
  format        text check (format is null or format in ('jpg', 'png', 'webp')),
  width         integer check (width is null or width > 0),
  height        integer check (height is null or height > 0),
  bytes         integer check (bytes is null or bytes >= 0),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz,
  deleted_at    timestamptz,
  constraint media_assets_active_has_metadata check (
    status <> 'active'
    or (secure_url is not null and format is not null and width is not null and height is not null)
  )
);

create index media_assets_status_created_idx on public.media_assets (status, created_at);

-- ---------------------------------------------------------------------
-- Configurações gerais (linha única)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id                 smallint primary key default 1 check (id = 1),
  brand_name         text not null default 'Cleides Dias' check (char_length(brand_name) between 1 and 80),
  brand_subtitle     text not null default '' check (char_length(brand_subtitle) <= 80),
  whatsapp_number    text not null default '' check (whatsapp_number = '' or whatsapp_number ~ '^55[0-9]{10,11}$'),
  phone_display      text not null default '' check (char_length(phone_display) <= 40),
  phone_label        text not null default '' check (char_length(phone_label) <= 40),
  email              text not null default '' check (char_length(email) <= 120),
  instagram          text not null default '' check (char_length(instagram) <= 31),
  instagram_label    text not null default '' check (char_length(instagram_label) <= 40),
  city               text not null default '' check (char_length(city) <= 80),
  city_note          text not null default '' check (char_length(city_note) <= 80),
  logo               jsonb check (logo is null or jsonb_typeof(logo) = 'object'),
  seo_image          jsonb check (seo_image is null or jsonb_typeof(seo_image) = 'object'),
  social_links       jsonb not null default '[]' check (jsonb_typeof(social_links) = 'array'),
  whatsapp_messages  jsonb not null default '{}' check (jsonb_typeof(whatsapp_messages) = 'object'),
  nav                jsonb not null default '{}' check (jsonb_typeof(nav) = 'object'),
  footer             jsonb not null default '{}' check (jsonb_typeof(footer) = 'object'),
  seo                jsonb not null default '{}' check (jsonb_typeof(seo) = 'object'),
  updated_at         timestamptz not null default now(),
  updated_by         uuid references auth.users (id) on delete set null
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Conteúdo das seções editáveis (textos e imagens de cada bloco do site)
-- O formato de cada `content` é validado pelos schemas Zod do backend.
-- ---------------------------------------------------------------------
create table public.site_sections (
  key         text primary key check (key in ('hero', 'about', 'packages', 'gallery', 'how', 'faq', 'contact', 'legal')),
  content     jsonb not null default '{}' check (jsonb_typeof(content) = 'object'),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

create trigger site_sections_set_updated_at
before update on public.site_sections
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Pacotes fotográficos
-- Destaques (resumo rápido) e itens incluídos são valores próprios do pacote,
-- sempre lidos e gravados juntos; por isso ficam em colunas jsonb/text[]
-- validadas pela API, em vez de uma tabela relacional separada.
-- ---------------------------------------------------------------------
create table public.packages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  name            text not null check (char_length(name) between 1 and 120),
  subtitle        text not null default '' check (char_length(subtitle) <= 200),
  description     text not null default '' check (char_length(description) <= 2000),
  category        text not null default '' check (char_length(category) <= 80),
  price           numeric(10, 2) check (price is null or price >= 0),
  promo_price     numeric(10, 2) check (promo_price is null or promo_price >= 0),
  highlights      jsonb not null default '[]' check (jsonb_typeof(highlights) = 'array'),
  included_items  text[] not null default '{}',
  extra_info      text not null default '' check (char_length(extra_info) <= 1000),
  cover           jsonb check (cover is null or jsonb_typeof(cover) = 'object'),
  cover_on_card   boolean not null default false,
  photos          jsonb not null default '[]' check (jsonb_typeof(photos) = 'array'),
  featured        boolean not null default false,
  status          public.publication_status not null default 'draft',
  position        integer not null default 0 check (position >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint packages_promo_lower_than_price check (
    promo_price is null or (price is not null and promo_price < price)
  ),
  constraint packages_published_requires_price check (status <> 'published' or price is not null)
);

create index packages_status_position_idx on public.packages (status, position);

create trigger packages_set_updated_at
before update on public.packages
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Galeria
-- ---------------------------------------------------------------------
create table public.gallery_images (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references public.media_assets (id) on delete restrict,
  title        text not null default '' check (char_length(title) <= 120),
  description  text not null default '' check (char_length(description) <= 500),
  category     text not null default '' check (char_length(category) <= 60),
  alt          text not null default '' check (char_length(alt) <= 300),
  focal_x      numeric(5, 2) not null default 50 check (focal_x between 0 and 100),
  focal_y      numeric(5, 2) not null default 50 check (focal_y between 0 and 100),
  zoom         numeric(4, 2) not null default 1 check (zoom between 1 and 2.5),
  ratio        text not null default 'auto' check (ratio in ('auto', '4/5', '1/1', '3/2', '16/9')),
  status       public.publication_status not null default 'draft',
  position     integer not null default 0 check (position >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index gallery_images_status_position_idx on public.gallery_images (status, position);
create index gallery_images_category_idx on public.gallery_images (category);
create index gallery_images_asset_idx on public.gallery_images (asset_id);

create trigger gallery_images_set_updated_at
before update on public.gallery_images
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Dúvidas frequentes
-- ---------------------------------------------------------------------
create table public.faq_items (
  id          uuid primary key default gen_random_uuid(),
  question    text not null check (char_length(question) between 1 and 300),
  answer      text not null check (char_length(answer) between 1 and 5000),
  category    text not null default '' check (char_length(category) <= 60),
  status      public.publication_status not null default 'draft',
  position    integer not null default 0 check (position >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index faq_items_status_position_idx on public.faq_items (status, position);

create trigger faq_items_set_updated_at
before update on public.faq_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Etapas da seção "Como funciona"
-- ---------------------------------------------------------------------
create table public.process_steps (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 120),
  description  text not null default '' check (char_length(description) <= 600),
  note         text not null default '' check (char_length(note) <= 300),
  icon         text not null default 'chat' check (icon ~ '^[a-z_]{2,40}$'),
  image        jsonb check (image is null or jsonb_typeof(image) = 'object'),
  status       public.publication_status not null default 'draft',
  position     integer not null default 0 check (position >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index process_steps_status_position_idx on public.process_steps (status, position);

create trigger process_steps_set_updated_at
before update on public.process_steps
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Reordenação atômica (usada pela API com a service role)
-- ---------------------------------------------------------------------
create or replace function public.reorder_rows(p_table text, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_table not in ('packages', 'gallery_images', 'faq_items', 'process_steps') then
    raise exception 'Tabela não permitida para reordenação: %', p_table;
  end if;
  execute format(
    'update public.%I as t set position = o.ord - 1
       from unnest($1::uuid[]) with ordinality as o(id, ord)
      where t.id = o.id',
    p_table
  ) using p_ids;
end;
$$;

revoke all on function public.reorder_rows(text, uuid[]) from public;
grant execute on function public.reorder_rows(text, uuid[]) to service_role;

-- =====================================================================
-- Row Level Security
-- A API usa a service role (que ignora RLS). As políticas abaixo protegem
-- os dados caso alguém use a chave pública (anon) diretamente: visitantes
-- só leem conteúdo publicado e apenas administradores podem escrever.
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.media_assets    enable row level security;
alter table public.site_settings   enable row level security;
alter table public.site_sections   enable row level security;
alter table public.packages        enable row level security;
alter table public.gallery_images  enable row level security;
alter table public.faq_items       enable row level security;
alter table public.process_steps   enable row level security;

-- Perfis: cada administrador lê o próprio perfil. Sem políticas de escrita.
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Mídia: leitura pública de arquivos ativos; escrita só por administradores.
create policy "media_select_active" on public.media_assets
  for select to anon, authenticated
  using (status = 'active' or (select public.is_admin()));
create policy "media_admin_write" on public.media_assets
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Configurações e seções: leitura pública; escrita só por administradores.
create policy "settings_select_all" on public.site_settings
  for select to anon, authenticated using (true);
create policy "settings_admin_write" on public.site_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "sections_select_all" on public.site_sections
  for select to anon, authenticated using (true);
create policy "sections_admin_write" on public.site_sections
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Coleções: visitantes veem só o que está publicado; administradores veem e editam tudo.
create policy "packages_select_published" on public.packages
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "packages_admin_write" on public.packages
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "gallery_select_published" on public.gallery_images
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "gallery_admin_write" on public.gallery_images
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "faq_select_published" on public.faq_items
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "faq_admin_write" on public.faq_items
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "steps_select_published" on public.process_steps
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "steps_admin_write" on public.process_steps
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
