import { useEffect } from 'react';
import { env } from '../lib/env';
import { cdnUrl } from '../lib/cdn';

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  noindex?: boolean;
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

/** Título e metadados de cada página (título, descrição, canonical, Open Graph e robots). */
export function Seo({ title, description, path, image, noindex }: SeoProps) {
  useEffect(() => {
    document.title = title;
    const url = path !== undefined ? `${env.siteUrl}${path}` : undefined;
    const img = image ? (image.startsWith('/') ? `${env.siteUrl}${image}` : cdnUrl(image, 1200)) : undefined;
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
    upsert('meta[property="og:image"]', meta('property', 'og:image'), 'content', img);
    upsert('meta[name="twitter:card"]', meta('name', 'twitter:card'), 'content', img ? 'summary_large_image' : 'summary');
  }, [title, description, path, image, noindex]);
  return null;
}
