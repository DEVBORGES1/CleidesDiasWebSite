import { Icon } from '../../components/Icon';
import styles from './SiteStates.module.css';

export function SiteLoading() {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <Icon name="photo_camera" size={28} color="var(--gold)" />
      <span className={styles.spinner} aria-hidden="true" />
      <span className="sr-only">Carregando o site…</span>
    </div>
  );
}

export function SiteError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.wrap} role="alert">
      <Icon name="cloud_off" size={32} color="var(--gold)" />
      <h1 className={styles.title}>Não foi possível carregar o site</h1>
      <p className={styles.text}>Verifique sua conexão e tente novamente em instantes.</p>
      <button type="button" className={styles.btn} onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}
