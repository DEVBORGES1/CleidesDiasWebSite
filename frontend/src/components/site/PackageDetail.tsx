import { HIGHLIGHT_TYPES, formatPrice, type Package } from '@cleides/shared';
import { useState } from 'react';
import { useBodyLock } from '../../hooks/useBodyLock';
import { useDialog } from '../../hooks/useDialog';
import type { SiteModel } from '../../pages/public/siteModel';
import { cdnUrl } from '../../lib/cdn';
import { FramedImage } from '../FramedImage';
import { Icon } from '../Icon';
import styles from './PackageDetail.module.css';

interface Props {
  model: SiteModel;
  pkg: Package;
  compact: boolean;
  onClose: () => void;
}

export function PackageDetail({ model, pkg, compact, onClose }: Props) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  useBodyLock(true);
  const images = [pkg.cover, ...pkg.photos].filter((i): i is NonNullable<typeof i> => !!i?.url);
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  const feats = pkg.highlights.filter((h) => h.value);

  const closeBtn = (
    <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
      <Icon name="close" size={22} />
    </button>
  );

  return (
    <div className={styles.backdrop} data-compact={compact || undefined} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-detail-title"
        tabIndex={-1}
        className={styles.dialog}
        data-compact={compact || undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {current ? (
          <div className={styles.media}>
            <FramedImage image={current} sizes="(max-width: 600px) 100vw, 540px" maxWidth={1200} eager />
            {images.length > 1 && (
              <div className={styles.thumbs}>
                {images.map((img, n) => (
                  <button
                    key={`${img.url}-${n}`}
                    type="button"
                    aria-label={`Ver foto ${n + 1}`}
                    aria-pressed={n === index}
                    className={styles.thumb}
                    data-on={n === index || undefined}
                    onClick={() => setIndex(n)}
                    style={{ backgroundImage: `url('${cdnUrl(img.url, 120)}')` }}
                  />
                ))}
              </div>
            )}
            {closeBtn}
          </div>
        ) : (
          <div className={styles.noMedia}>{closeBtn}</div>
        )}
        <div className={styles.body}>
          <div className={styles.titleRow}>
            <h3 id="package-detail-title" className={styles.title}>
              {pkg.name}
            </h3>
            {pkg.price != null && (
              <span className={styles.prices}>
                {pkg.promoPrice != null && <span className={styles.oldPrice}>R$ {formatPrice(pkg.price)}</span>}
                <span className={styles.price}>R$ {formatPrice(pkg.promoPrice ?? pkg.price)}</span>
              </span>
            )}
          </div>
          {feats.length > 0 && (
            <div className={styles.feats}>
              {feats.map((f, i) => (
                <span key={i} className={styles.feat}>
                  <Icon name={HIGHLIGHT_TYPES.find((t) => t.type === f.type)?.icon ?? 'check'} size={16} color="var(--gold)" />
                  {f.value}
                </span>
              ))}
            </div>
          )}
          {pkg.description && <p className={styles.description}>{pkg.description}</p>}
          {pkg.includedItems.length > 0 && (
            <ul className={styles.items}>
              {pkg.includedItems.map((it, i) => (
                <li key={i}>
                  <Icon name="check" size={18} color="var(--gold)" style={{ flex: 'none' }} />
                  {it}
                </li>
              ))}
            </ul>
          )}
          {pkg.extraInfo && <p className={styles.extra}>{pkg.extraInfo}</p>}
          <div className={styles.actions}>
            <a
              href={model.links.packageLink(pkg.name)}
              target={model.links.external ? '_blank' : undefined}
              rel="noopener"
              className={styles.primary}
              onClick={model.links.external ? undefined : onClose}
            >
              <Icon name="chat" size={20} />
              Quero este pacote
            </a>
            <button type="button" className={styles.secondary} onClick={onClose}>
              Ver outros pacotes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
