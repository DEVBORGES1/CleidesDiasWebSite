import { useEffect } from 'react';
import { env } from '../lib/env';
import { cdnUrl } from '../lib/cdn';

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  noindex?: boolean;
  /** Dados estruturados (JSON-LD) da página. */
  jsonLd?: Record<string, unknown>;
}

/** Cria ou atualiza uma tag do <head> (sem duplicar as que vêm do index.html). */
function upsert(selector: string, create: () => HTMLElement, attr: string, value: string | undefined) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (value === undefined) {
    if (el?.dataset.seo === 'dynamic') el.remove();
    return;
  }
  if (!el) {
    el = create();
    el.dataset.seo = 'dynamic';
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const meta = (key: 'name' | 'property', name: string) => () => {
  const m = document.createElement('meta');
  m.setAttribute(key, name);
  return m;
};

/** URL absoluta da imagem de compartilhamento (imagens locais ganham o domínio do site). */
export function absoluteImage(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  return image.startsWith('/') ? `${env.siteUrl}${image}` : cdnUrl(image, 1200);
}

/** Título e metadados de cada página (título, descrição, canonical, Open Graph, robots e JSON-LD). */
export function Seo({ title, description, path, image, noindex, jsonLd }: SeoProps) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : undefined;
  useEffect(() => {
    document.title = title;
    const url = path !== undefined ? `${env.siteUrl}${path}` : undefined;
    const img = absoluteImage(image);
    upsert('meta[name="description"]', meta('name', 'description'), 'content', description || undefined);
    upsert('meta[name="robots"]', meta('name', 'robots'), 'content', noindex ? 'noindex, nofollow' : undefined);
    upsert(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement('link');
        l.rel = 'canonical';
        return l;
      },
      'href',
      url,
    );
    upsert('meta[property="og:title"]', meta('property', 'og:title'), 'content', title);
    upsert('meta[property="og:description"]', meta('property', 'og:description'), 'content', description || undefined);
    upsert('meta[property="og:type"]', meta('property', 'og:type'), 'content', 'website');
    upsert('meta[property="og:locale"]', meta('property', 'og:locale'), 'content', 'pt_BR');
    upsert('meta[property="og:url"]', meta('property', 'og:url'), 'content', url);
    if (img && img !== document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')) {
      // As dimensões e a descrição fixas do index.html valem só para a imagem padrão.
      document.head.querySelectorAll('meta[property^="og:image:"]').forEach((m) => m.remove());
      upsert('meta[property="og:image"]', meta('property', 'og:image'), 'content', img);
    }
    upsert('meta[name="twitter:card"]', meta('name', 'twitter:card'), 'content', 'summary_large_image');
    let script = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (!ld) script?.remove();
    else {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = ld;
    }
  }, [title, description, path, image, noindex, ld]);
  return null;
}
