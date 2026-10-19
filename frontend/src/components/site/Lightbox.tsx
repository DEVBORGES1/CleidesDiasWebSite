import { imageAspect, type GalleryImage } from '@cleides/shared';
import { useEffect, useRef } from 'react';
import { useBodyLock } from '../../hooks/useBodyLock';
import { useDialog } from '../../hooks/useDialog';
import { FramedImage } from '../FramedImage';
import { Icon } from '../Icon';
import styles from './Lightbox.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  items: GalleryImage[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({ items, index, onChange, onClose }: Props) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  useBodyLock(true);
  const touchX = useRef(0);
  const n = items.length;
  const step = (d: number) => onChange((index + d + n) % n);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') stepRef.current(1);
      else if (e.key === 'ArrowLeft') stepRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cur = items[index];
  if (!cur) return null;
  const ar = imageAspect(cur.image, 1.25);
  const caption = cur.title || cur.image.alt;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      className={styles.root}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? 0)}
      onTouchEnd={(e) => {
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      }}
    >
      <div className={styles.top}>
        <span className={styles.counter} aria-live="polite">
          {pad(index + 1)} / {pad(n)}
        </span>
        <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
          <Icon name="close" size={28} />
        </button>
      </div>
      <div className={styles.stage}>
        <div key={cur.id} className={styles.frame} style={{ width: `min(100cqw, calc(100cqh * ${ar}))`, aspectRatio: String(ar) }}>
          <FramedImage image={{ ...cur.image, alt: cur.image.alt || cur.title }} sizes="90vw" maxWidth={2000} eager />
        </div>
      </div>
      <div className={styles.bottom}>
        <button type="button" className={styles.nav} aria-label="Foto anterior" onClick={() => step(-1)} disabled={n < 2}>
          <Icon name="arrow_back" size={22} />
        </button>
        <span className={styles.caption}>{caption}</span>
        <button type="button" className={styles.nav} aria-label="Próxima foto" onClick={() => step(1)} disabled={n < 2}>
          <Icon name="arrow_forward" size={22} />
        </button>
      </div>
    </div>
  );
}
