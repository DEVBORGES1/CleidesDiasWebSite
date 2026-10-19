const WIDTHS = [480, 800, 1200, 1600, 2000];

const isCloudinary = (url: string) => /^https:\/\/res\.cloudinary\.com\/.+\/image\/upload\//.test(url);

/** URL otimizada pelo Cloudinary (formato automático, qualidade automática e largura limitada). */
export function cdnUrl(url: string, width: number): string {
  if (!url || !isCloudinary(url)) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

/** `srcset` responsivo para imagens do Cloudinary (vazio para imagens locais). */
export function cdnSrcSet(url: string, maxWidth = 2000): string | undefined {
  if (!url || !isCloudinary(url)) return undefined;
  return WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${cdnUrl(url, w)} ${w}w`)
    .join(', ');
}
