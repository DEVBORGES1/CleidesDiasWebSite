import type { SectionId } from '../../hooks/useSiteEffects';
import type { SiteModel } from '../../pages/public/siteModel';
import { FramedImage } from '../FramedImage';
import { Icon } from '../Icon';
import { Ornament } from './Ornament';
import styles from './AboutSection.module.css';

interface Props {
  model: SiteModel;
  compact: boolean;
  onNav: (id: SectionId) => void;
}

export function AboutSection({ model, compact, onNav }: Props) {
  const a = model.sections.about;
  const paragraphs = a.text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const target = a.ctaTarget;
  const href = target === 'instagram' ? model.links.instagram || '#contato' : target === 'contato' ? '#contato' : model.links.whatsapp;
  const external = (target === 'instagram' && !!model.links.instagram) || (target === 'whatsapp' && model.links.external);

  return (
    <section id="sobre" data-sec="sobre" className={styles.section} aria-labelledby="sobre-title">
      <div className={styles.container}>
        {compact && a.eyebrow && (
          <div className={styles.mobileHead}>
            <Ornament />
            <span className={styles.eyebrow}>{a.eyebrow}</span>
          </div>
        )}
        <div data-reveal="" className={styles.photoWrap}>
          <div className={styles.frameLine} />
          <div className={styles.photo}>
            <div data-parallax="0.05" className={styles.parallax}>
              <FramedImage image={a.image} sizes="(max-width: 1000px) 90vw, 480px" maxWidth={1200} />
            </div>
          </div>
          {(a.cardName || a.cardRole) && (
            <div className={styles.card}>
              {a.cardName && <span className={styles.cardName}>{a.cardName}</span>}
              {a.cardRole && <span className={styles.cardRole}>{a.cardRole}</span>}
            </div>
          )}
        </div>
        <div data-reveal="" className={styles.copy}>
          {!compact && (
            <>
              <Ornament />
              {a.eyebrow && <span className={styles.eyebrow}>{a.eyebrow}</span>}
            </>
          )}
          <h2 id="sobre-title" className={styles.title}>
            {a.titleStart} {a.titleHighlight && <em>{a.titleHighlight}</em>}
          </h2>
          {model.settings.slogan && <p className={styles.slogan}>{model.settings.slogan}</p>}
          {paragraphs.map((p, i) => (
            <p key={i} className={styles.paragraph}>
              {p}
            </p>
          ))}
          {a.highlights.length > 0 && (
            <ul className={styles.list}>
              {a.highlights.map((h, i) => (
                <li key={i}>
                  <Icon name="check" size={18} color="var(--gold)" style={{ flex: 'none' }} />
                  {h}
                </li>
              ))}
            </ul>
          )}
          {a.ctaLabel && (
            <div className={styles.actions}>
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel="noopener"
                className={styles.cta}
                onClick={
                  href === '#contato'
                    ? (e) => {
                        e.preventDefault();
                        onNav('contato');
                      }
                    : undefined
                }
              >
                <Icon name="chat" size={20} />
                {a.ctaLabel}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
