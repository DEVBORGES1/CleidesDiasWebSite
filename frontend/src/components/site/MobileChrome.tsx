import { useBodyLock } from '../../hooks/useBodyLock';
import { useDialog } from '../../hooks/useDialog';
import type { SectionId } from '../../hooks/useSiteEffects';
import type { SiteModel } from '../../pages/public/siteModel';
import { Icon } from '../Icon';
import styles from './MobileChrome.module.css';

interface MenuProps {
  model: SiteModel;
  onNav: (id: SectionId) => void;
  onClose: () => void;
}

/** Menu em tela cheia do celular. */
export function MobileMenu({ model, onNav, onClose }: MenuProps) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  useBodyLock(true);
  const { nav, show, settings } = model;
  const items: [SectionId, string, boolean][] = [
    ['inicio', nav.inicio, true],
    ['pacotes', nav.pacotes, show.packages],
    ['galeria', nav.galeria, show.gallery],
    ['sobre', nav.sobreCompleto, true],
    ['duvidas', nav.duvidas, show.faq],
    ['contato', nav.contato, true],
  ];
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" className={styles.menu}>
      <div className={styles.menuTop}>
        <span className={styles.menuBrand}>
          <Icon name="photo_camera" size={20} color="var(--gold)" />
          <span className={styles.menuBrandName}>{settings.brandName}</span>
          {settings.brandSubtitle && <span className={styles.menuBrandSub}>{settings.brandSubtitle}</span>}
        </span>
        <button type="button" className={styles.iconBtn} aria-label="Fechar menu" onClick={onClose}>
          <Icon name="close" size={28} />
        </button>
      </div>
      <nav className={styles.menuNav} aria-label="Menu principal">
        {items
          .filter(([, , visible]) => visible)
          .map(([id, label], i) => (
            <a
              key={id}
              href={`#${id}`}
              className={styles.menuLink}
              style={{ animationDelay: `${0.04 + i * 0.04}s` }}
              onClick={(e) => {
                e.preventDefault();
                onNav(id);
              }}
            >
              {label}
            </a>
          ))}
      </nav>
      <div className={styles.menuActions}>
        <a
          href="#contato"
          className={styles.menuPrimary}
          onClick={(e) => {
            e.preventDefault();
            onNav('contato');
          }}
        >
          <Icon name="calendar_month" size={20} />
          {nav.agendar}
        </a>
        <a href={model.links.whatsapp} target={model.links.external ? '_blank' : undefined} rel="noopener" className={styles.menuOutline}>
          <Icon name="chat" size={20} />
          {nav.whatsappMenu}
        </a>
      </div>
    </div>
  );
}

interface TabBarProps {
  model: SiteModel;
  active: SectionId;
  onNav: (id: SectionId) => void;
}

/** Navegação rápida fixa no rodapé da tela (celular). */
export function TabBar({ model, active, onNav }: TabBarProps) {
  const { nav, show } = model;
  const tabs: [SectionId, string, string, boolean][] = [
    ['inicio', nav.inicio, 'home', true],
    ['pacotes', nav.pacotes, 'sell', show.packages],
    ['galeria', nav.galeria, 'photo_library', show.gallery],
    ['contato', nav.contato, 'chat', true],
  ];
  const visible = tabs.filter((t) => t[3]);
  return (
    <nav aria-label="Navegação rápida" className={styles.tabbar} style={{ gridTemplateColumns: `repeat(${visible.length}, 1fr)` }}>
      {visible.map(([id, label, icon]) => (
        <a
          key={id}
          href={`#${id}`}
          className={styles.tab}
          data-active={active === id || undefined}
          aria-current={active === id ? 'true' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNav(id);
          }}
        >
          <Icon name={icon} size={23} />
          {label}
        </a>
      ))}
    </nav>
  );
}

export function WhatsAppFab({ model }: { model: SiteModel }) {
  return (
    <a
      href={model.links.whatsapp}
      target={model.links.external ? '_blank' : undefined}
      rel="noopener"
      aria-label="Falar no WhatsApp"
      className={styles.fab}
    >
      <Icon name="chat" size={22} />
      {model.nav.botaoFlutuante}
    </a>
  );
}
