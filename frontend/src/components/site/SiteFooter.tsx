import { Link } from 'react-router';
import type { SectionId } from '../../hooks/useSiteEffects';
import type { SiteModel } from '../../pages/public/siteModel';
import { Icon } from '../Icon';
import styles from './SiteFooter.module.css';

interface Props {
  model: SiteModel;
  compact: boolean;
  onNav?: (id: SectionId) => void;
}

export function SiteFooter({ model, compact, onNav }: Props) {
  const { settings, nav, show } = model;
  const f = settings.footer;
  const link = (id: SectionId, label: string) =>
    onNav ? (
      <a
        key={id}
        href={`#${id}`}
        onClick={(e) => {
          e.preventDefault();
          onNav(id);
        }}
      >
        {label}
      </a>
    ) : (
      <Link key={id} to={`/#${id}`}>
        {label}
      </Link>
    );

  return (
    <footer data-fab-hide="" data-pick="rodape" className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand} data-compact={compact || undefined}>
            <Icon name="photo_camera" size={24} color="var(--gold)" />
            <span className={styles.brandName}>{settings.brandName}</span>
            {settings.brandSubtitle && <span className={styles.brandSub}>{settings.brandSubtitle}</span>}
          </div>
          {f.tagline && <p className={styles.tagline}>{f.tagline}</p>}
          <nav aria-label="Rodapé" className={styles.links}>
            {show.packages && link('pacotes', nav.pacotes)}
            {show.gallery && link('galeria', nav.galeria)}
            {link('sobre', nav.sobre)}
            {show.faq && link('duvidas', nav.duvidas)}
            {link('contato', nav.contato)}
          </nav>
        </div>
        <div className={styles.bottom}>
          <span className={styles.legal}>{f.legal}</span>
          <span className={styles.legalLinks}>
            {settings.socialLinks.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener">
                {s.label}
              </a>
            ))}
            {f.privacyLabel && <Link to="/privacidade">{f.privacyLabel}</Link>}
            {f.dataLabel && <Link to="/privacidade#dados">{f.dataLabel}</Link>}
          </span>
        </div>
      </div>
    </footer>
  );
}
