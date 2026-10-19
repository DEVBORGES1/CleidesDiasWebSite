import type { SiteModel } from '../../pages/public/siteModel';
import { FramedImage } from '../FramedImage';
import { Icon } from '../Icon';
import { Bokeh } from './Decorations';
import { Ornament } from './Ornament';
import styles from './ContactSection.module.css';

export function ContactSection({ model, compact }: { model: SiteModel; compact: boolean }) {
  const c = model.sections.contact;
  const s = model.settings;
  const ext = model.links.external ? '_blank' : undefined;

  return (
    <section id="contato" data-sec="contato" data-fab-hide="" className={styles.section} aria-labelledby="contato-title">
      <div data-reveal="" className={styles.card} data-compact={compact || undefined}>
        <div className={styles.media}>
          <div data-parallax="0.07" className={styles.parallax}>
            <FramedImage image={c.image} sizes="(max-width: 1000px) 100vw, 560px" maxWidth={1200} />
          </div>
          <Bokeh count={13} seed={5} />
        </div>
        <div className={styles.body}>
          <Ornament className={styles.selfAlign} />
          {c.eyebrow && <span className={`${styles.eyebrow} ${styles.selfAlign}`}>{c.eyebrow}</span>}
          <h2 id="contato-title" className={styles.title}>
            {c.title}
          </h2>
          {c.text && <p className={styles.text}>{c.text}</p>}
          <div className={styles.ctaWrap}>
            {c.buttonLabel && (
              <a href={model.links.schedule} target={ext} rel="noopener" className={styles.cta}>
                <Icon name="chat" size={23} />
                {c.buttonLabel}
                <Icon name="arrow_forward" size={20} />
              </a>
            )}
            {c.note && <span className={styles.note}>{c.note}</span>}
          </div>
          <div className={styles.infos}>
            {s.phoneDisplay && (
              <a href={model.links.whatsapp} target={ext} rel="noopener" className={styles.info}>
                <span className={styles.infoIcon}>
                  <Icon name="chat" size={20} color="var(--primary)" />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoMain}>{s.phoneDisplay}</span>
                  <span className={styles.infoSub}>{s.phoneLabel}</span>
                </span>
              </a>
            )}
            {s.instagram && (
              <a href={model.links.instagram} target="_blank" rel="noopener" className={styles.info}>
                <span className={styles.infoIcon}>
                  <Icon name="photo_camera" size={20} color="var(--primary)" />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoMain}>{s.instagram}</span>
                  <span className={styles.infoSub}>{s.instagramLabel}</span>
                </span>
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} className={styles.info}>
                <span className={styles.infoIcon}>
                  <Icon name="mail" size={20} color="var(--primary)" />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoMain}>{s.email}</span>
                  <span className={styles.infoSub}>E-mail</span>
                </span>
              </a>
            )}
            {s.city && (
              <div className={styles.info}>
                <span className={styles.infoIcon}>
                  <Icon name="location_on" size={20} color="var(--primary)" />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoMain}>{s.city}</span>
                  {s.cityNote && <span className={styles.infoSub}>{s.cityNote}</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
