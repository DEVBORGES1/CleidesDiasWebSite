import { formatPrice, type Package } from '@cleides/shared';
import type { SiteModel } from '../../pages/public/siteModel';
import { FramedImage } from '../FramedImage';
import { Icon } from '../Icon';
import { DraftBadge, SectionHeading } from './Ornament';
import styles from './PackagesSection.module.css';

interface Props {
  model: SiteModel;
  compact: boolean;
  onOpen: (p: Package) => void;
}

const summary = (p: Package) =>
  p.highlights
    .map((h) => h.value)
    .filter(Boolean)
    .join(' · ');

export function PackagesSection({ model, compact, onOpen }: Props) {
  const s = model.sections.packages;
  return (
    <section id="pacotes" data-sec="pacotes" className={styles.section} aria-labelledby="pacotes-title">
      <div className={styles.container}>
        <SectionHeading id="pacotes-title" title={s.title} subtitle={s.subtitle} />

        {compact ? (
          <div className={styles.mobileList}>
            {model.packages.map((p) => {
              const featured = p.featured;
              const draft = p.status === 'draft';
              const cardImg = p.coverOnCard && !!p.cover?.url;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpen(p)}
                  className={styles.mobileCard}
                  data-featured={featured || undefined}
                  data-draft={draft || undefined}
                  data-img={cardImg || undefined}
                  aria-label={`${p.name}, ver detalhes`}
                >
                  {featured && s.featuredBadge && <span className={`${styles.badge} ${styles.badgeMobile}`}>{s.featuredBadge}</span>}
                  {draft && <DraftBadge className={styles.draftMobile} />}
                  {cardImg && (
                    <span className={styles.mobileThumb}>
                      <FramedImage image={p.cover} sizes="76px" maxWidth={480} decorative />
                    </span>
                  )}
                  <span className={styles.mobileText}>
                    <span className={styles.mobileName}>{p.name}</span>
                    <span className={styles.mobileSummary}>{summary(p)}</span>
                    <span className={styles.mobilePrices}>
                      {p.promoPrice != null && <span className={styles.oldPrice}>R$ {formatPrice(p.price)}</span>}
                      {p.price != null && <span className={styles.mobilePrice}>R$ {formatPrice(p.promoPrice ?? p.price)}</span>}
                    </span>
                  </span>
                  <span className={styles.arrow} data-featured={featured || undefined}>
                    <Icon name="arrow_forward" size={20} />
                  </span>
                </button>
              );
            })}
            {s.mobileHint && <span className={styles.hint}>{s.mobileHint}</span>}
          </div>
        ) : (
          <div className={styles.grid}>
            {model.packages.map((p) => {
              const featured = p.featured;
              const draft = p.status === 'draft';
              const cardImg = p.coverOnCard && !!p.cover?.url;
              return (
                <article
                  key={p.id}
                  data-reveal=""
                  className={styles.card}
                  data-featured={featured || undefined}
                  data-draft={draft || undefined}
                  data-img={cardImg || undefined}
                >
                  {featured && s.featuredBadge && <span className={styles.badge}>{s.featuredBadge}</span>}
                  {draft && <DraftBadge className={styles.draftDesktop} />}
                  {cardImg && (
                    <div className={styles.cardMedia} style={{ aspectRatio: '4 / 3' }}>
                      <FramedImage image={p.cover} sizes="(max-width: 1200px) 33vw, 380px" maxWidth={800} />
                    </div>
                  )}
                  <Icon name={featured ? 'park' : 'eco'} size={26} weight={250} color="var(--gold-soft)" />
                  <h3 className={styles.cardName}>{p.name}</h3>
                  {p.subtitle && <p className={styles.cardSubtitle}>{p.subtitle}</p>}
                  <div className={styles.priceBlock}>
                    {p.promoPrice != null && <span className={styles.oldPrice}>De R$ {formatPrice(p.price)}</span>}
                    {p.price != null && (
                      <div className={styles.price}>
                        <span className={styles.currency}>R$</span>
                        <span className={styles.amount}>{formatPrice(p.promoPrice ?? p.price)}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.divider} />
                  <ul className={styles.items}>
                    {p.includedItems.map((it, i) => (
                      <li key={i}>
                        <Icon name="check" size={18} color="var(--gold)" style={{ flex: 'none' }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className={styles.detailsBtn} data-featured={featured || undefined} onClick={() => onOpen(p)}>
                    Ver detalhes<span className="sr-only"> do pacote {p.name}</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>
          {s.questionLead && <span className={styles.lead}>{s.questionLead}</span>}
          {s.questionButton && (
            <a
              href={model.links.whatsapp}
              target={model.links.external ? '_blank' : undefined}
              rel="noopener"
              className={styles.waBtn}
            >
              <Icon name="chat" size={20} />
              {s.questionButton}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

