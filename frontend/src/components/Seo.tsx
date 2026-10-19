import { env } from '../lib/env';
import { cdnUrl } from '../lib/cdn';

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  noindex?: boolean;
}

/** Título e metadados da página (React 19 move estes elementos para o <head>). */
export function Seo({ title, description, path, image, noindex }: SeoProps) {
  const url = path !== undefined ? `${env.siteUrl}${path}` : undefined;
  const img = image ? (image.startsWith('/') ? `${env.siteUrl}${image}` : cdnUrl(image, 1200)) : undefined;
  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="pt_BR" />
      {url && <meta property="og:url" content={url} />}
      {img && <meta property="og:image" content={img} />}
      <meta name="twitter:card" content={img ? 'summary_large_image' : 'summary'} />
    </>
  );
}
