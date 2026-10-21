import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Alert, Button, Card } from '../../components/admin/ui';
import { useAdmin } from '../../contexts/AdminContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard, useFaq, useGallery, useLots, usePackages, useSteps } from '../../hooks/useAdminData';
import { adminApi } from '../../services/api';
import { PageError, PageHeader, PageLoading } from './common';
import styles from './DashboardPage.module.css';

const SHORTCUTS = [
  { to: '/admin/pacotes/novo', icon: 'sell', label: 'Adicionar pacote' },
  { to: '/admin/galeria', icon: 'add_photo_alternate', label: 'Enviar fotos' },
  { to: '/admin/duvidas?nova=1', icon: 'help', label: 'Adicionar pergunta' },
  { to: '/admin/como-funciona?nova=1', icon: 'route', label: 'Adicionar etapa' },
];

interface DraftRow {
  key: string;
  to: string;
  icon: string;
  kind: string;
  name: string;
}

/** Lista o que está em rascunho, com atalho para editar cada item e para ver tudo na prévia. */
function DraftsCard({ count }: { count: number }) {
  const packages = usePackages();
  const gallery = useGallery();
  const faq = useFaq();
  const steps = useSteps();
  const lots = useLots();
  const drafts = <T extends { id: string; status: string }>(list: T[] | undefined) => (list ?? []).filter((i) => i.status === 'draft');

  const rows: DraftRow[] = [
    ...drafts(packages.data).map((p) => ({ key: `p-${p.id}`, to: `/admin/pacotes/${p.id}`, icon: 'sell', kind: 'Pacote', name: p.name })),
    ...drafts(gallery.data).map((g) => ({ key: `g-${g.id}`, to: `/admin/galeria/${g.id}`, icon: 'photo_library', kind: 'Foto da galeria', name: g.title || 'Foto sem título' })),
    ...drafts(faq.data).map((f) => ({ key: `f-${f.id}`, to: `/admin/duvidas?abrir=${f.id}`, icon: 'help', kind: 'Pergunta frequente', name: f.question })),
    ...drafts(steps.data).map((s) => ({ key: `s-${s.id}`, to: `/admin/como-funciona?abrir=${s.id}`, icon: 'route', kind: 'Etapa do atendimento', name: s.title })),
    ...drafts(lots.data).map((l) => ({ key: `l-${l.id}`, to: `/admin/lotes?abrir=${l.id}`, icon: 'confirmation_number', kind: 'Lote', name: l.name })),
  ];

  return (
    <Card
      title="Em rascunho"
      description={
        <>
          Você tem <strong>{count}</strong> {count === 1 ? 'item em rascunho' : 'itens em rascunho'} que ainda não aparecem no site. Abra um para continuar editando ou veja todos na prévia, onde aparecem
          marcados.
        </>
      }
    >
      {rows.length > 0 && (
        <ul className={styles.drafts}>
          {rows.map((r) => (
            <li key={r.key}>
              <Link to={r.to} className={styles.draft}>
                <span className={styles.shortcutIcon}>
                  <Icon name={r.icon} size={20} />
                </span>
                <span className={styles.draftText}>
                  <span className={styles.draftName}>{r.name}</span>
                  <span className={styles.draftKind}>{r.kind}</span>
                </span>
                <Icon name="chevron_right" size={20} color="var(--muted)" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div>
        <a href="/?preview=1" target="_blank" rel="noopener" className={styles.previewLink}>
          <Icon name="visibility" size={18} />
          Ver rascunhos na prévia
        </a>
      </div>
    </Card>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export function DashboardPage() {
  const { profile } = useAuth();
  const q = useDashboard();
  const d = q.data;
  const name = profile?.fullName?.split(' ')[0];
  const { run, toast, refreshSite } = useAdmin();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const missingContent = !!d && (!d.whatsappConfigured || !d.packages.total || !d.faq.total || !d.steps.total);

  const seedDemo = async () => {
    setSeeding(true);
    const r = await run(() => adminApi.seedDemo());
    setSeeding(false);
    if (!r) return;
    toast(r.seeded.length ? 'Conteúdo inicial carregado.' : 'Nada a carregar: o conteúdo já existe.');
    void queryClient.invalidateQueries();
    refreshSite();
  };

  const stats = d
    ? [
        { to: '/admin/pacotes', icon: 'sell', label: 'Pacotes', ...d.packages, feminine: false, note: d.packages.featured ? `${d.packages.featured} em destaque` : '' },
        { to: '/admin/galeria', icon: 'photo_library', label: 'Fotos na galeria', ...d.gallery, feminine: true, note: '' },
        { to: '/admin/duvidas', icon: 'help', label: 'Perguntas frequentes', ...d.faq, feminine: true, note: '' },
        { to: '/admin/como-funciona', icon: 'route', label: 'Etapas do atendimento', ...d.steps, feminine: true, note: '' },
      ]
    : [];

  return (
    <>
      <PageHeader
        group="Painel"
        title={`${greeting()}${name ? `, ${name}` : ''}!`}
        description="Um resumo do que está no ar e atalhos para as tarefas mais comuns."
      />
      {q.isPending && <PageLoading />}
      {q.isError && <PageError error={q.error} onRetry={() => q.refetch()} />}
      {d && (
        <>
          <section className={styles.statusCard}>
            <span className={styles.statusIcon}>
              <Icon name="public" size={24} />
            </span>
            <div className={styles.statusText}>
              <span className={styles.statusTitle}>Site no ar</span>
              <span className={styles.statusDesc}>
                {d.lastUpdatedAt ? `Última alteração em ${new Date(d.lastUpdatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.` : 'Nenhuma alteração registrada ainda.'}{' '}
                Itens publicados aparecem para os visitantes; rascunhos ficam só no painel.
              </span>
            </div>
            <a href="/" target="_blank" rel="noopener" className={styles.statusLink}>
              <Icon name="open_in_new" size={16} />
              Abrir site
            </a>
          </section>

          {missingContent && (
            <Card
              title="Conteúdo inicial"
              description="Preenche o que ainda está vazio com os textos, fotos, pacotes, dúvidas e etapas do modelo aprovado. Nada do que você já editou é substituído."
            >
              <div>
                <Button variant="primary" icon="auto_awesome" loading={seeding} onClick={seedDemo}>
                  Carregar conteúdo inicial
                </Button>
              </div>
            </Card>
          )}

          {!d.whatsappConfigured && (
            <Alert icon="warning">
              O número do WhatsApp ainda não foi configurado: os botões de agendamento não funcionarão.{' '}
              <Link to="/admin/contato">Configurar agora</Link>
            </Alert>
          )}
          {d.pendingDrafts > 0 && <DraftsCard count={d.pendingDrafts} />}

          <div className={styles.stats}>
            {stats.map((s) => (
              <Link key={s.to} to={s.to} className={styles.stat}>
                <span className={styles.statHead}>
                  <Icon name={s.icon} size={20} color="var(--primary)" />
                  {s.label}
                </span>
                <span className={styles.statNumber}>{s.total}</span>
                <span className={styles.statMeta}>
                  {s.published} {s.feminine ? (s.published === 1 ? 'publicada' : 'publicadas') : s.published === 1 ? 'publicado' : 'publicados'}
                  {s.draft > 0 && ` · ${s.draft} em rascunho`}
                  {s.note && ` · ${s.note}`}
                </span>
              </Link>
            ))}
          </div>

          <Card title="Atalhos">
            <div className={styles.shortcuts}>
              {SHORTCUTS.map((s) => (
                <Link key={s.to} to={s.to} className={styles.shortcut}>
                  <span className={styles.shortcutIcon}>
                    <Icon name={s.icon} size={20} />
                  </span>
                  {s.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Seções do site" description="Seções sem nenhum item publicado ficam ocultas automaticamente (e somem do menu).">
            <ul className={styles.sections}>
              {d.visibleSections.map((s) => (
                <li key={s.key}>
                  <Icon name={s.visible ? 'visibility' : 'visibility_off'} size={18} color={s.visible ? '#5E7F55' : 'var(--muted)'} />
                  <span className={styles.sectionName}>{s.label}</span>
                  <span className={s.visible ? styles.on : styles.off}>{s.visible ? 'Visível no site' : 'Oculta — nada publicado'}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
