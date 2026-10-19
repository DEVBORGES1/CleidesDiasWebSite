import type { SectionId } from '../../hooks/useSiteEffects';
import type { SiteModel } from '../../pages/public/siteModel';
import { FramedImage } from '../FramedImage';
import { Icon } from '../Icon';
import { Sparkles } from './Decorations';
import { Ornament } from './Ornament';
import styles from './Hero.module.css';

const BENEFIT_ICONS = ['person', 'image', 'park', 'favorite'];

interface Props {
  model: SiteModel;
  compact: boolean;
  onNav: (id: SectionId) => void;
}

export function Hero({ model, compact, onNav }: Props) {
  const hero = model.sections.hero;
  const go = (id: SectionId) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNav(id);
  };
  // O botão secundário leva à galeria; sem fotos publicadas, ele não é exibido.
  const secondary = 'galeria' as const;
  const showSecondary = model.show.gallery && !!hero.secondaryButton;

  return (
    <>
      {compact ? (
        <section id="inicio" data-sec="inicio" className={styles.mobile} aria-labelledby="hero-title">
          <div className={styles.mobileMedia}>
            <div data-parallax="0.06" className={styles.parallax}>
              <FramedImage image={hero.image} sizes="100vw" eager />
            </div>
            <Sparkles count={10} seed={11} />
            <div className={styles.mobileFade} />
          </div>
          <div className={styles.mobileBody}>
            {hero.eyebrow && <span className={styles.mobileEyebrow}>{hero.eyebrow}</span>}
            <h1 id="hero-title" className={styles.mobileTitle}>
              {hero.title}
            </h1>
            {hero.text && <p className={styles.text}>{hero.text}</p>}
            <div className={styles.mobileButtons}>
              {model.show.packages && hero.primaryButton && (
                <a href="#pacotes" onClick={go('pacotes')} className={`${styles.btnPrimary} ${styles.btnBlock}`}>
                  {hero.primaryButton}
                  <Icon name="arrow_forward" size={20} />
                </a>
              )}
              {showSecondary && (
                <a href={`#${secondary}`} onClick={go(secondary)} className={`${styles.btnOutline} ${styles.btnBlock}`}>
                  {hero.secondaryButton}
                </a>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section id="inicio" data-sec="inicio" className={styles.desktop} aria-labelledby="hero-title">
          <div className={styles.media}>
            <div data-parallax="0.06" className={styles.parallax}>
              <FramedImage image={hero.image} sizes="64vw" eager />
            </div>
            <div className={styles.mediaFade} />
          </div>
          <Sparkles count={18} seed={7} />
          <div className={styles.content}>
            <div className={styles.copy}>
              <Ornament />
              {hero.eyebrow && <span className={styles.eyebrow}>{hero.eyebrow}</span>}
              <h1 id="hero-title" className={styles.title}>
                {hero.title}
              </h1>
              {hero.text && <p className={`${styles.text} ${styles.textNarrow}`}>{hero.text}</p>}
              <div className={styles.buttons}>
                {model.show.packages && hero.primaryButton && (
                  <a href="#pacotes" onClick={go('pacotes')} className={`${styles.btnPrimary} ${styles.btnGrow}`}>
                    {hero.primaryButton}
                    <Icon name="arrow_forward" size={19} />
                  </a>
                )}
                {showSecondary && (
                  <a href={`#${secondary}`} onClick={go(secondary)} className={`${styles.btnOutline} ${styles.btnGlass}`}>
                    {hero.secondaryButton}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {hero.benefits.length > 0 && (
        <section className={styles.benefits} aria-label="Diferenciais">
          <ul className={styles.benefitsGrid} data-compact={compact || undefined}>
            {hero.benefits.map((b, i) => (
              <li key={i} className={styles.benefit}>
                <Icon name={BENEFIT_ICONS[i] ?? 'favorite'} size={30} weight={250} color="var(--gold)" style={{ flex: 'none' }} />
                <span className={styles.benefitText}>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
