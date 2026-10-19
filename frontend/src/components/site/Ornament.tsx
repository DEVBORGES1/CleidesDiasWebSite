import { Icon } from '../Icon';
import styles from './Ornament.module.css';

/** Traço — pinheiro — traço, usado acima dos títulos. */
export function Ornament({ wide = false, className }: { wide?: boolean; className?: string }) {
  return (
    <div className={`${styles.ornament} ${className ?? ''}`} aria-hidden="true">
      <span className={wide ? styles.lineWide : styles.line} />
      <Icon name="park" size={wide ? 22 : 20} />
      <span className={wide ? styles.lineWide : styles.line} />
    </div>
  );
}

export function SectionHeading({ id, title, subtitle }: { id?: string; title: string; subtitle?: string }) {
  return (
    <div className={styles.heading} data-reveal="">
      <Ornament wide />
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}

export function DraftBadge({ className }: { className?: string }) {
  return <span className={`${styles.draft} ${className ?? ''}`}>Rascunho</span>;
}
