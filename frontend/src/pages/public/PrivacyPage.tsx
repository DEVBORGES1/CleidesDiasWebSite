import { parseRichText } from '@cleides/shared/utils';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import { SiteFooter } from '../../components/site/SiteFooter';
import { useCompact } from '../../hooks/useMediaQuery';
import { useSite } from '../../hooks/useSite';
import { buildSiteModel } from './siteModel';
import { SiteError, SiteLoading } from './SiteStates';
import styles from './PrivacyPage.module.css';

export function PrivacyPage() {
  const query = useSite(false);
  const compact = useCompact();
  const model = useMemo(() => (query.data ? buildSiteModel(query.data) : null), [query.data]);

  useEffect(() => {
    if (model && window.location.hash === '#dados') document.getElementById('dados')?.scrollIntoView();
  }, [model]);

  if (query.isPending) return <SiteLoading />;
  if (!model) return <SiteError onRetry={() => query.refetch()} />;

  const blocks = parseRichText(model.sections.legal.privacyText);
  const title = model.settings.footer.privacyLabel || 'Política de privacidade';
  let dataAnchorPlaced = false;

  return (
    <div className={styles.root}>
      <Seo title={`${title} · ${model.settings.brandName}`} description="Como tratamos seus dados." path="/privacidade" />
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          <Icon name="arrow_back" size={18} />
          {model.settings.brandName}
        </Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        {blocks.length === 0 && <p>O estúdio ainda não publicou este texto.</p>}
        {blocks.map((b, i) => {
          if (b.type === 'list')
            return (
              <ul key={i}>
                {b.items.map((li, j) => (
                  <li key={j}>{li}</li>
                ))}
              </ul>
            );
          const isHeading = !b.text.includes('\n') && b.text.length < 60 && !/[.!?:]$/.test(b.text);
          if (isHeading) {
            const id = !dataAnchorPlaced && /dados/i.test(b.text) ? 'dados' : undefined;
            if (id) dataAnchorPlaced = true;
            return (
              <h2 key={i} id={id}>
                {b.text}
              </h2>
            );
          }
          return <p key={i}>{b.text}</p>;
        })}
      </main>
      <SiteFooter model={model} compact={compact} />
    </div>
  );
}
