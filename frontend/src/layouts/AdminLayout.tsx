import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useBlocker, useLocation, useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { Seo } from '../components/Seo';
import { Button, IconButton } from '../components/admin/ui';
import { PreviewPane } from '../components/admin/PreviewPane';
import { AdminProvider, useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useAdminData';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ADMIN_NAV, navItemFor, type AdminNavItem } from './adminNav';
import styles from './AdminLayout.module.css';

export function AdminLayout() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  return (
    <AdminProvider previewFrame={frameRef}>
      <Shell frameRef={frameRef} />
    </AdminProvider>
  );
}

function Shell({ frameRef }: { frameRef: React.RefObject<HTMLIFrameElement | null> }) {
  const { editor, confirm, toast } = useAdmin();
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const wide = useMediaQuery('(min-width: 1280px)');
  const narrow = useMediaQuery('(max-width: 999px)');
  const [previewOn, setPreviewOn] = useState<boolean | null>(null);
  const showPreview = !narrow && (previewOn ?? wide);
  const current = navItemFor(location.pathname);
  const dirty = !!editor?.dirty;
  const saving = !!editor?.saving;

  // Avisa antes de sair da página com alterações não salvas.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => !!(editor?.isDirty?.() ?? dirty) && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm({
      title: 'Sair sem salvar?',
      text: 'Você fez alterações que ainda não foram salvas nesta página. Se sair agora, elas serão perdidas.',
      confirmLabel: 'Sair sem salvar',
      icon: 'warning',
    }).then((ok) => {
      if (ok) {
        editor?.discard();
        blocker.proceed();
      } else blocker.reset();
    });
  }, [blocker, confirm, editor]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Ctrl/Cmd + S salva a página atual.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (editor?.dirty && !editor.saving) void editor.save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor]);

  useEffect(() => {
    document.getElementById('admin-main')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const counts: Record<string, number | undefined> = {
    galeria: dashboard.data?.gallery.total,
    como: dashboard.data?.steps.total,
    faq: dashboard.data?.faq.total,
    pacotes: dashboard.data?.packages.total,
  };

  const status = saving
    ? { label: 'Salvando…', cls: styles.statusSaving }
    : dirty
      ? { label: 'Alterações não salvas', cls: styles.statusDirty }
      : { label: 'Tudo salvo', cls: styles.statusClean };

  const navButton = (n: AdminNavItem) => (
    <NavLink key={n.id} to={n.path} end={n.path === '/admin'} className={styles.navItem}>
      <Icon name={n.icon} size={19} className={styles.navIcon} />
      <span className={styles.navLabel}>{n.label}</span>
      {current?.id === n.id && dirty && <span className={styles.dirtyDot} title="Alterações não salvas" />}
      {counts[n.id] !== undefined && <span className={styles.navMeta}>{counts[n.id]}</span>}
    </NavLink>
  );

  const groups: AdminNavItem['group'][] = ['Painel', 'Conteúdo do site', 'Vendas e serviços'];

  return (
    <div className={styles.root}>
      <Seo title={`${current?.label ?? 'Painel'} · Painel do site`} noindex />
      <a href="#admin-main" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <Icon name="photo_camera" size={20} color="var(--primary)" />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Cleides Dias</span>
            <span className={styles.brandSub}>Painel do site</span>
          </span>
        </div>
        <div className={styles.actions}>
          <span role="status" className={`${styles.status} ${status.cls}`} title={status.label}>
            <span className={styles.statusDot} />
            {!narrow && <span>{status.label}</span>}
          </span>
          {dirty && (
            <Button variant="ghost" icon="undo" onClick={() => editor?.discard()} disabled={saving}>
              {!narrow && 'Descartar'}
            </Button>
          )}
          {!narrow && !showPreview && (
            <Button icon="splitscreen_right" onClick={() => setPreviewOn(true)}>
              Mostrar prévia
            </Button>
          )}
          <a href="/?preview=1" target="_blank" rel="noopener" className={styles.viewBtn} title="Abre o site em outra aba, com os rascunhos marcados">
            <Icon name="open_in_new" size={18} />
            {!narrow && <span>Visualizar</span>}
          </a>
          <Button
            variant="primary"
            icon="check"
            loading={saving}
            disabled={!dirty}
            title="Grava as alterações desta página. Itens publicados passam a aparecer no site."
            onClick={() => void editor?.save()}
          >
            {narrow ? 'Salvar' : 'Salvar alterações'}
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        {!narrow && (
          <nav aria-label="Seções do painel" className={styles.sidebar}>
            {groups.map((g) => (
              <div key={g} className={styles.navGroup}>
                {g !== 'Painel' && <span className={styles.groupLabel}>{g}</span>}
                {ADMIN_NAV.filter((n) => n.group === g).map(navButton)}
              </div>
            ))}
            <span className={styles.navSpacer} />
            <div className={styles.navBottom}>
              {ADMIN_NAV.filter((n) => n.group === 'Avançado').map(navButton)}
              {showPreview && (
                <div className={styles.tip}>
                  <Icon name="ads_click" size={16} color="var(--primary)" style={{ flex: 'none' }} />
                  <span>
                    Dica: ative <strong>Selecionar</strong> na prévia e clique em uma parte do site para abrir o editor dela.
                  </span>
                </div>
              )}
              <div className={styles.account}>
                <span className={styles.accountEmail} title={auth.profile?.email}>
                  {auth.profile?.email}
                </span>
                <IconButton
                  icon="logout"
                  label="Sair do painel"
                  onClick={async () => {
                    if (dirty && !(await confirm({ title: 'Sair sem salvar?', text: 'As alterações não salvas serão perdidas.', confirmLabel: 'Sair', icon: 'warning' }))) return;
                    await auth.signOut();
                    toast('Você saiu do painel.', 'info');
                    navigate('/admin/entrar', { replace: true });
                  }}
                />
              </div>
            </div>
          </nav>
        )}

        <main id="admin-main" className={styles.main} tabIndex={-1}>
          {narrow && (
            <div className={styles.chips} role="navigation" aria-label="Seções do painel">
              {ADMIN_NAV.map((n) => (
                <NavLink key={n.id} to={n.path} end={n.path === '/admin'} className={styles.chip}>
                  <Icon name={n.icon} size={17} />
                  {n.label}
                </NavLink>
              ))}
              <button type="button" className={styles.chip} onClick={() => void auth.signOut().then(() => navigate('/admin/entrar'))}>
                <Icon name="logout" size={17} />
                Sair
              </button>
            </div>
          )}
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>

        {showPreview && <PreviewPane frameRef={frameRef} sec={current?.sec} onHide={() => setPreviewOn(false)} />}
      </div>
    </div>
  );
}
