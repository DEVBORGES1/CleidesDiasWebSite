import { imageAspect, type GalleryImage } from '@cleides/shared';
import { useMemo, useState } from 'react';
import type { SiteModel } from '../../pages/public/siteModel';
import { FramedImage } from '../FramedImage';
import { Icon } from '../Icon';
import { DraftBadge, SectionHeading } from './Ornament';
import styles from './GallerySection.module.css';

interface Props {
  model: SiteModel;
  onOpen: (items: GalleryImage[], index: number) => void;
}

export function GallerySection({ model, onOpen }: Props) {
  const s = model.sections.gallery;
  const categories = useMemo(() => [...new Set(model.gallery.map((g) => g.category).filter(Boolean))], [model.gallery]);
  const [category, setCategory] = useState<string | null>(null);
  const items = category ? model.gallery.filter((g) => g.category === category) : model.gallery;

  return (
    <section id="galeria" data-sec="galeria" className={styles.section} aria-labelledby="galeria-title">
      <div className={styles.container}>
        <SectionHeading id="galeria-title" title={s.title} subtitle={s.subtitle} />

        {categories.length > 1 && (
          <div className={styles.filters} role="group" aria-label="Filtrar por categoria">
            <button type="button" className={styles.chip} aria-pressed={category === null} onClick={() => setCategory(null)}>
              Todas
            </button>
            {categories.map((c) => (
              <button key={c} type="button" className={styles.chip} aria-pressed={category === c} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        <div className={styles.grid}>
          {items.map((g, i) => {
            const ar = +imageAspect(g.image, 1.25).toFixed(3);
            const label = g.title || g.image.alt || 'Foto do ensaio';
            return (
              <figure
                key={g.id}
                data-cascade=""
                className={styles.figure}
                style={{ flex: `${ar} 1 calc(${ar} * clamp(96px, 13.5cqi, 170px))`, aspectRatio: String(ar) }}
              >
                <button type="button" className={styles.open} onClick={() => onOpen(items, i)} aria-label={`Ampliar: ${label}`}>
                  <span className={styles.zoomLayer}>
                    <FramedImage image={{ ...g.image, alt: g.image.alt || g.title }} sizes="(max-width: 600px) 50vw, 25vw" maxWidth={1200} />
                  </span>
                  <span className={styles.shade} aria-hidden="true" />
                  <span className={styles.caption} aria-hidden="true">
                    {g.category && <span className={styles.album}>{g.category}</span>}
                    {g.title && <span className={styles.title}>{g.title}</span>}
                    <span className={styles.see}>
                      <span className={styles.seeLine} />
                      Ver foto
                    </span>
                  </span>
                  <span className={styles.zoomBtn} aria-hidden="true">
                    <Icon name="open_in_full" size={17} />
                  </span>
                </button>
                {g.status === 'draft' && <DraftBadge className={styles.draft} />}
              </figure>
            );
          })}
          <span className={styles.filler} />
        </div>

        {s.buttonLabel && (
          <div className={styles.more}>
            <button type="button" className={styles.moreBtn} onClick={() => onOpen(items, 0)}>
              {s.buttonLabel}
              <Icon name="arrow_forward" size={19} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function Marquee({ words }: { words: string[] }) {
  if (words.length === 0) return null;
  let list = words.slice();
  while (list.length < 8) list = list.concat(words);
  const group = (
    <div className={styles.marqueeGroup}>
      {list.map((w, i) => (
        <span key={i} className={styles.marqueeItem}>
          <span>{w}</span>
          <span className={styles.diamond} />
        </span>
      ))}
    </div>
  );
  return (
    <div aria-hidden="true" className={styles.marquee} data-pick="faixa">
      <div className={styles.marqueeTrack}>
        {group}
        {group}
      </div>
    </div>
  );
}
