-- =====================================================================
-- Slogan do estúdio
-- Exibido como citação na seção "Sobre" e nos dados estruturados (schema.org).
-- Textos ainda iguais ao modelo inicial (frase do rodapé e descrição para o
-- Google) passam a usar o slogan; textos já editados no painel não mudam.
-- =====================================================================
alter table public.site_settings
  add column slogan text not null default '' check (char_length(slogan) <= 160);

update public.site_settings
set slogan = 'Especialista em capturar o amor em detalhes para eternizá-los em fotografias!'
where id = 1 and slogan = '';

update public.site_settings
set footer = jsonb_set(footer, '{tagline}', to_jsonb(slogan))
where id = 1 and footer ->> 'tagline' = 'Mais do que fotos, são lembranças para sempre.';

update public.site_settings
set seo = jsonb_set(
  seo,
  '{description}',
  to_jsonb('Especialista em capturar o amor em detalhes para eternizá-los em fotografias! Ensaios de Natal para bebês, crianças e famílias em Videira – SC.'::text)
)
where id = 1
  and seo ->> 'description' = 'Ensaios fotográficos de Natal para bebês, crianças e famílias em Videira – SC. Conheça os pacotes e agende pelo WhatsApp.';
