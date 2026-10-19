import type { GalleryImage, Package } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import { AboutSection } from '../../components/site/AboutSection';
import { ContactSection } from '../../components/site/ContactSection';
import { FaqSection } from '../../components/site/FaqSection';
import { GallerySection, Marquee } from '../../components/site/GallerySection';
import { Hero } from '../../components/site/Hero';
import { HowSection } from '../../components/site/HowSection';
import { Lightbox } from '../../components/site/Lightbox';
import { MobileMenu, TabBar, WhatsAppFab } from '../../components/site/MobileChrome';
import { PackageDetail } from '../../components/site/PackageDetail';
import { PackagesSection } from '../../components/site/PackagesSection';
import { SiteFooter } from '../../components/site/SiteFooter';
import { SiteHeader } from '../../components/site/SiteHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useCompact, useReducedMotion } from '../../hooks/useMediaQuery';
import { scrollToSection, useParallax, usePreviewBridge, useReveal, useScrollState, type SectionId } from '../../hooks/useSiteEffects';
import { siteQueryKey, useSite } from '../../hooks/useSite';
import { buildSiteModel } from './siteModel';
import { SiteError, SiteLoading } from './SiteStates';
import styles from './HomePage.module.css';

export function HomePage() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const wantsPreview = params.get('preview') === '1';
  const preview = wantsPreview && auth.status === 'signedIn';
  const waitingAuth = wantsPreview && (auth.status === 'loading' || auth.status === 'idle');
  const { activate } = auth;
  useEffect(() => {
    if (wantsPreview) activate();
  }, [wantsPreview, activate]);
  const query = useSite(preview);
  const queryClient = useQueryClient();

  // O painel pede para atualizar a prévia sempre que algo é salvo.
  useEffect(() => {
    if (!preview) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'cleides:refresh') {
        void queryClient.invalidateQueries({ queryKey: siteQueryKey(true) });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [preview, queryClient]);

  if (waitingAuth || query.isPending) return <SiteLoading />;
  if (query.isError || !query.data) return <SiteError onRetry={() => query.refetch()} />;
  return <Home data={query.data} previewRequestedWithoutLogin={wantsPreview && !preview} />;
}

function Home({ data, previewRequestedWithoutLogin }: { data: Parameters<typeof buildSiteModel>[0]; previewRequestedWithoutLogin: boolean }) {
  const model = useMemo(() => buildSiteModel(data), [data]);
  const compact = useCompact();
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const [menu, setMenu] = useState(false);
  const [lightbox, setLightbox] = useState<{ items: GalleryImage[]; index: number } | null>(null);

  useReveal(rootRef, true, reduce || model.preview);
  useParallax(rootRef, true, reduce);
  const { active, scrolled, nearContact } = useScrollState(rootRef, true);
  usePreviewBridge(true);

  const detail = slug ? model.packages.find((p) => p.slug === slug) : undefined;
  const search = location.search;

  const onNav = useCallback(
    (id: SectionId) => {
      setMenu(false);
      if (slug) navigate({ pathname: '/', search }, { preventScrollReset: true });
      requestAnimationFrame(() => scrollToSection(id));
    },
    [navigate, slug, search],
  );

  const openPackage = useCallback(
    (p: Package) => navigate({ pathname: `/pacotes/${p.slug}`, search }, { preventScrollReset: true }),
    [navigate, search],
  );
  const closePackage = useCallback(() => navigate({ pathname: '/', search }, { preventScrollReset: true }), [navigate, search]);

  // Links como /#galeria (vindos de outras páginas) rolam até a seção.
  useEffect(() => {
    const id = location.hash.replace('#', '') as SectionId;
    if (id) requestAnimationFrame(() => scrollToSection(id, false));
  }, [location.hash]);

  const overlay = menu || !!lightbox || !!detail;
  // Dentro da prévia do painel a faixa de aviso é desnecessária.
  const inFrame = typeof window !== 'undefined' && window.parent !== window;
  const seo = model.settings.seo;
  const title = detail ? `${detail.name} · ${model.settings.brandName}` : seo.title || model.settings.brandName;
  const description = detail ? detail.description || detail.subtitle : seo.description;

  return (
    <div ref={rootRef} className={styles.root}>
      <Seo
        title={title}
        description={description}
        path={detail ? `/pacotes/${detail.slug}` : '/'}
        image={detail?.cover?.url ?? model.settings.seoImage?.url ?? model.sections.hero.image?.url}
        noindex={model.preview}
      />
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      {(model.preview || previewRequestedWithoutLogin) && !inFrame && (
        <div className={styles.previewBar} role="status">
          <Icon name={model.preview ? 'visibility' : 'lock'} size={18} />
          {model.preview
            ? 'Pré-visualização: itens em rascunho aparecem marcados e não são vistos pelos visitantes.'
            : 'Entre no painel para ver os rascunhos na pré-visualização.'}
        </div>
      )}
      <div className={styles.page}>
        <SiteHeader
          model={model}
          compact={compact}
          scrolled={scrolled}
          active={active}
          onNav={onNav}
          onOpenPackage={openPackage}
          onOpenMenu={() => setMenu(true)}
        />
        <main id="conteudo" tabIndex={-1} className={styles.main}>
          <Hero model={model} compact={compact} onNav={onNav} />
          {model.show.packages && <PackagesSection model={model} compact={compact} onOpen={openPackage} />}
          {model.show.gallery && <GallerySection model={model} onOpen={(items, index) => setLightbox({ items, index })} />}
          <Marquee words={model.sections.gallery.ticks} />
          <AboutSection model={model} compact={compact} onNav={onNav} />
          {model.show.how && <HowSection model={model} compact={compact} />}
          {model.show.faq && <FaqSection model={model} />}
          <ContactSection model={model} compact={compact} />
        </main>
        <SiteFooter model={model} compact={compact} onNav={onNav} />
        {compact && <div className={styles.tabSpacer} />}
      </div>

      {!compact && !overlay && !nearContact && <WhatsAppFab model={model} />}
      {compact && !overlay && <TabBar model={model} active={active} onNav={onNav} />}
      {menu && <MobileMenu model={model} onNav={onNav} onClose={() => setMenu(false)} />}
      {detail && <PackageDetail model={model} pkg={detail} compact={compact} onClose={closePackage} />}
      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onChange={(index) => setLightbox((lb) => (lb ? { ...lb, index } : lb))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
