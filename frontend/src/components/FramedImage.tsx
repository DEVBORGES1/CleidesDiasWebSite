import type { ImageValue } from '@cleides/shared';
import type { CSSProperties } from 'react';
import { cdnSrcSet, cdnUrl } from '../lib/cdn';

interface FramedImageProps {
  image: Pick<ImageValue, 'url' | 'x' | 'y' | 'zoom' | 'alt'> | null | undefined;
  /** Largura aproximada de exibição, para escolher o tamanho certo no CDN. */
  sizes?: string;
  maxWidth?: number;
  decorative?: boolean;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Foto preenchendo o quadro, respeitando o enquadramento definido no painel
 * (ponto focal x/y e zoom). Usa `srcset` do Cloudinary e carregamento preguiçoso.
 */
export function FramedImage({ image, sizes = '100vw', maxWidth = 2000, decorative, eager, className, style }: FramedImageProps) {
  if (!image?.url) return null;
  const pos = `${image.x ?? 50}% ${image.y ?? 50}%`;
  return (
    <img
      src={cdnUrl(image.url, Math.min(maxWidth, 1600))}
      srcSet={cdnSrcSet(image.url, maxWidth)}
      sizes={sizes}
      alt={decorative ? '' : image.alt || ''}
      aria-hidden={decorative || undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : undefined}
      draggable={false}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: pos,
        transform: `scale(${image.zoom ?? 1})`,
        transformOrigin: pos,
        display: 'block',
        ...style,
      }}
    />
  );
}
