import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Alert, Card } from '../../components/admin/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../hooks/useAdminData';
import { PageError, PageHeader, PageLoading } from './common';
import styles from './DashboardPage.module.css';

const SHORTCUTS = [
  { to: '/admin/pacotes/novo', icon: 'sell', label: 'Adicionar pacote' },
  { to: '/admin/galeria', icon: 'add_photo_alternate', label: 'Enviar fotos' },
  { to: '/admin/duvidas?nova=1', icon: 'help', label: 'Adicionar pergunta' },
  { to: '/admin/como-funciona?nova=1', icon: 'route', label: 'Adicionar etapa' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export function DashboardPage() {
  const { profile } = useAuth();
  const q = useDashboard();
  const d = q.data;
  const name = profile?.fullName?.split(' ')[0];

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

          {!d.whatsappConfigured && (
            <Alert icon="warning">
              O número do WhatsApp ainda não foi configurado: os botões de agendamento não funcionarão.{' '}
              <Link to="/admin/contato">Configurar agora</Link>
            </Alert>
          )}
          {d.pendingDrafts > 0 && (
            <Alert icon="edit_note">
              Você tem <strong>{d.pendingDrafts}</strong> {d.pendingDrafts === 1 ? 'item em rascunho' : 'itens em rascunho'} que ainda não aparecem no site.
            </Alert>
          )}

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
