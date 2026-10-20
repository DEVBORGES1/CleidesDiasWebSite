-- =====================================================================
-- Valores por lote
-- Lotes de preço por prazo (1º lote até 31/10, 2º lote até 30/11…). Cada lote
-- vale até `ends_on` (inclusive) e começa no dia seguinte ao fim do anterior;
-- o lote atual é decidido pela API com a data no fuso do estúdio.
-- Os valores de cada pacote no lote ficam em jsonb ([{packageId, price}]),
-- validados pela API, como os destaques dos pacotes.
-- =====================================================================
create table public.price_lots (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  ends_on     date not null unique,
  prices      jsonb not null default '[]' check (jsonb_typeof(prices) = 'array'),
  status      public.publication_status not null default 'draft',
  position    integer not null default 0 check (position >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index price_lots_status_ends_on_idx on public.price_lots (status, ends_on);

create trigger price_lots_set_updated_at
before update on public.price_lots
for each row execute function public.set_updated_at();

alter table public.price_lots enable row level security;

create policy "lots_select_published" on public.price_lots
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "lots_admin_write" on public.price_lots
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Textos da nova seção do site.
alter table public.site_sections drop constraint site_sections_key_check;
alter table public.site_sections add constraint site_sections_key_check
  check (key in ('hero', 'about', 'packages', 'gallery', 'how', 'lots', 'faq', 'contact', 'legal'));

-- Os lotes também entram na reordenação atômica (mantém a mesma interface das outras coleções).
create or replace function public.reorder_rows(p_table text, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_table not in ('packages', 'gallery_images', 'faq_items', 'process_steps', 'price_lots') then
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
