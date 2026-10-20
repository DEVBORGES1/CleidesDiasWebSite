import { daysBetween, formatDayMonth, formatPrice, lotPriceFor } from '@cleides/shared/utils';
import type { LotPhase, LotWithPhase } from '@cleides/shared';
import type { SiteModel } from '../../pages/public/siteModel';
import { Icon } from '../Icon';
import { DraftBadge, SectionHeading } from './Ornament';
import styles from './LotsSection.module.css';

const PHASE_LABEL: Record<LotPhase, string> = { ended: 'Encerrado', current: 'Atual', upcoming: 'Em breve' };
const PHASE_ICON: Record<LotPhase, string | null> = { ended: 'check', current: 'star', upcoming: null };

function remaining(today: string, endsOn: string): string {
  const days = daysBetween(today, endsOn);
  if (days <= 0) return 'último dia';
  return days === 1 ? 'falta 1 dia' : `faltam ${days} dias`;
}

/** "até 31/10", "de 01/11 a 30/11" ou "até 30/11 · faltam 10 dias" (lote atual). */
function period(lot: LotWithPhase, today: string): string {
  const end = formatDayMonth(lot.endsOn);
  if (lot.phase === 'current') return `até ${end} · ${remaining(today, lot.endsOn)}`;
  if (lot.phase === 'upcoming' && lot.startsOn) return `de ${formatDayMonth(lot.startsOn)} a ${end}`;
  return `até ${end}`;
}

const money = (v: number | null) => (v == null ? '—' : `R$ ${formatPrice(v)}`);

export function LotsSection({ model, compact }: { model: SiteModel; compact: boolean }) {
  const s = model.sections.lots;
  const { lots, today } = model;
  const current = lots.find((l) => l.phase === 'current');

  return (
    <section id="lotes" data-sec="lotes" className={styles.section} aria-labelledby="lotes-title">
      <div className={styles.container}>
        <SectionHeading id="lotes-title" title={s.title} subtitle={s.subtitle} />

        <ol className={styles.timeline} data-reveal="" style={{ ['--lots' as string]: lots.length }}>
          {lots.map((lot) => (
            <li key={lot.id} className={styles.lot} data-phase={lot.phase} aria-current={lot.phase === 'current' ? 'step' : undefined}>
              <span className={styles.dot} data-draft={lot.status === 'draft' || undefined}>
                {PHASE_ICON[lot.phase] && <Icon name={PHASE_ICON[lot.phase]!} size={16} />}
              </span>
              <span className={styles.lotText}>
                <span className={styles.lotName}>
                  {lot.name}
                  {lot.phase === 'current' && <span className={styles.lotPhase}>· {PHASE_LABEL.current}</span>}
                  {lot.status === 'draft' && <DraftBadge />}
                </span>
                <span className={styles.lotPeriod}>
                  {period(lot, today)}
                  {lot.phase === 'ended' && ` · ${PHASE_LABEL.ended.toLowerCase()}`}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {compact ? (
          <div className={styles.cards}>
            {model.lotPackages.map((p) => {
              const now = lotPriceFor(current, p.id);
              const later = lots.filter((l) => l.phase === 'upcoming' && lotPriceFor(l, p.id) != null);
              return (
                <article key={p.id} data-reveal="" className={styles.card} data-featured={p.featured || undefined}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.cardName}>{p.name}</h3>
                    {now != null && <span className={styles.cardPrice}>{money(now)}</span>}
                  </div>
                  {current && now != null && <span className={styles.cardLot}>{period(current, today)}</span>}
                  {later.length > 0 && (
                    <ul className={styles.cardNext}>
                      {later.map((l) => (
                        <li key={l.id}>
                          <span>
                            {l.name}
                            {l.startsOn && ` · a partir de ${formatDayMonth(l.startsOn)}`}
                          </span>
                          <span>{money(lotPriceFor(l, p.id))}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.tableWrap} data-reveal="">
            <table className={styles.table}>
              <caption className="sr-only">Valor de cada pacote em cada lote</caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.pkgCol}>
                    Pacote
                  </th>
                  {lots.map((l) => (
                    <th key={l.id} scope="col" data-phase={l.phase}>
                      {l.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.lotPackages.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className={styles.pkgCol}>
                      <span className={styles.pkgName}>{p.name}</span>
                      {p.featured && model.sections.packages.featuredBadge && <span className={styles.pkgBadge}>{model.sections.packages.featuredBadge}</span>}
                    </th>
                    {lots.map((l) => {
                      const v = lotPriceFor(l, p.id);
                      return (
                        <td key={l.id} data-phase={l.phase}>
                          {l.phase === 'ended' && v != null ? <s>{money(v)}</s> : money(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {s.note && (
          <p className={styles.note}>
            <Icon name="event_available" size={19} color="var(--gold)" style={{ flex: 'none' }} />
            {s.note}
          </p>
        )}
      </div>
    </section>
  );
}
