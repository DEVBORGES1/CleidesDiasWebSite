import { describe, expect, it } from 'vitest';
import { cdnSrcSet, cdnUrl } from './cdn';

const url = 'https://res.cloudinary.com/demo/image/upload/v1/cleides/gallery/abc.jpg';

describe('otimização de imagens', () => {
  it('aplica formato, qualidade e largura automáticos do Cloudinary', () => {
    expect(cdnUrl(url, 800)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v1/cleides/gallery/abc.jpg');
  });
  it('gera srcset responsivo respeitando a largura máxima', () => {
    expect(cdnSrcSet(url, 1200)?.split(', ')).toHaveLength(3);
  });
  it('mantém imagens locais intactas', () => {
    expect(cdnUrl('/images/cleides.jpg', 800)).toBe('/images/cleides.jpg');
    expect(cdnSrcSet('/images/cleides.jpg')).toBeUndefined();
  });
});
