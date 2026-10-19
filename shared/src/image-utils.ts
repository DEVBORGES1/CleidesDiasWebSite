import type { ImageRatio } from './constants.js';

interface FrameInfo {
  ratio: ImageRatio;
  width: number | null;
  height: number | null;
}

/** Proporção (largura/altura) usada para desenhar o quadro da imagem. */
export function imageAspect(img: FrameInfo | null | undefined, fallback = 1): number {
  if (!img) return fallback;
  if (img.ratio && img.ratio !== 'auto') {
    const [w, h] = img.ratio.split('/').map(Number);
    if (w && h) return w / h;
  }
  if (img.width && img.height) return img.width / img.height;
  return fallback;
}

export function ratioLabel(ratio: ImageRatio): string {
  return { auto: 'Original', '4/5': 'Retrato', '1/1': 'Quadrado', '3/2': 'Paisagem', '16/9': 'Panorâmica' }[ratio];
}
