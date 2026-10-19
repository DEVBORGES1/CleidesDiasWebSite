import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import styles from './SiteStates.module.css';

export function NotFoundPage() {
  return (
    <main className={styles.wrap}>
      <Seo title="Página não encontrada · Cleides Dias Fotografia" noindex />
      <Icon name="photo_camera" size={32} color="var(--gold)" />
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.text}>O endereço pode ter mudado ou não existe mais.</p>
      <Link to="/" className={styles.btn} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
        Voltar ao início
      </Link>
    </main>
  );
}
