import { formatPrice, ROMAN } from '@cleides/shared/utils';
import type { Package } from '@cleides/shared';
import { useState } from 'react';
import type { SectionId } from '../../hooks/useSiteEffects';
import type { SiteModel } from '../../pages/public/siteModel';
import { cdnUrl } from '../../lib/cdn';
import { Icon } from '../Icon';
import styles from './SiteHeader.module.css';

interface Props {
  model: SiteModel;
  compact: boolean;
  scrolled: boolean;
  active: SectionId;
  onNav: (id: SectionId) => void;
  onOpenPackage: (p: Package) => void;
  onOpenMenu: () => void;
}

export function SiteHeader({ model, compact, scrolled, active, onNav, onOpenPackage, onOpenMenu }: Props) {
  const { settings, nav, show } = model;
  const [dd, setDd] = useState(false);
  const pill = scrolled;

  const link = (id: SectionId, label: string) => (
    <a
      key={id}
      href={`#${id}`}
      className={styles.navLink}
      data-active={active === id || undefined}
      aria-current={active === id ? 'true' : undefined}
      onClick={(e) => {
        e.preventDefault();
        onNav(id);
      }}
    >
      {label}
    </a>
  );

  return (
    <header data-header="" data-pick="cabecalho" className={styles.header} data-pill={pill || undefined} data-compact={compact || undefined}>
      <div className={styles.inner}>
        <a
          href="#inicio"
          className={styles.logo}
          aria-label={`${settings.brandName} — início`}
          onClick={(e) => {
            e.preventDefault();
            onNav('inicio');
          }}
        >
          <img
            src={settings.logo?.url ? cdnUrl(settings.logo.url, 480) : '/images/logo.webp'}
            alt={settings.brandName}
            className={styles.logoImg}
            width={788}
            height={200}
          />
        </a>

        {!compact && (
          <>
            <nav aria-label="Principal" className={styles.nav}>
              {link('inicio', nav.inicio)}
              {show.packages && (
                <div
                  className={styles.dropdownWrap}
                  onMouseEnter={() => setDd(true)}
                  onMouseLeave={() => setDd(false)}
                  onFocus={() => setDd(true)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDd(false);
                  }}
                  onKeyDown={(e) => e.key === 'Escape' && setDd(false)}
                >
                  <a
                    href="#pacotes"
                    className={styles.navLink}
                    data-active={active === 'pacotes' || undefined}
                    aria-expanded={dd}
                    aria-haspopup="true"
                    onClick={(e) => {
                      e.preventDefault();
                      setDd(false);
                      onNav('pacotes');
                    }}
                  >
                    {nav.pacotes}
                    <Icon name="expand_more" size={18} color="var(--gold)" className={styles.chevron} style={{ transform: dd ? 'rotate(180deg)' : 'none' }} />
                  </a>
                  {dd && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownPanel}>
                        {model.packages.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            className={styles.ddItem}
                            onClick={() => {
                              setDd(false);
                              onOpenPackage(p);
                            }}
                          >
                            <span className={styles.ddRoman}>{ROMAN[i] ?? i + 1}</span>
                            <span className={styles.ddText}>
                              <span className={styles.ddName}>{p.name}</span>
                              <span className={styles.ddSummary}>
                                {p.highlights
                                  .slice(0, 2)
                                  .map((h) => h.value)
                                  .join(' · ')}
                              </span>
                            </span>
                            {model.priceOf(p).amount != null && <span className={styles.ddPrice}>R$ {formatPrice(model.priceOf(p).amount)}</span>}
                          </button>
                        ))}
                        <a
                          href="#pacotes"
                          className={styles.ddAll}
                          onClick={(e) => {
                            e.preventDefault();
                            setDd(false);
                            onNav('pacotes');
                          }}
                        >
                          {nav.verTodosPacotes}
                          <Icon name="arrow_forward" size={18} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {show.gallery && link('galeria', nav.galeria)}
              {link('sobre', nav.sobre)}
              {show.faq && link('duvidas', nav.duvidas)}
              {link('contato', nav.contato)}
            </nav>
            <a
              href="#contato"
              className={styles.cta}
              onClick={(e) => {
                e.preventDefault();
                onNav('contato');
              }}
            >
              <Icon name="calendar_month" size={19} />
              {nav.agendar}
            </a>
          </>
        )}

        {compact && (
          <button type="button" className={styles.menuBtn} aria-label="Abrir menu" onClick={onOpenMenu}>
            <Icon name="menu" size={28} />
          </button>
        )}
      </div>
    </header>
  );
}
