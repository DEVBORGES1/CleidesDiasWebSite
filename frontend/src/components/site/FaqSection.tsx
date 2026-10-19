import { parseRichText } from '@cleides/shared/utils';
import { useState } from 'react';
import type { SiteModel } from '../../pages/public/siteModel';
import { Icon } from '../Icon';
import { DraftBadge, SectionHeading } from './Ornament';
import styles from './FaqSection.module.css';

export function FaqSection({ model }: { model: SiteModel }) {
  const s = model.sections.faq;
  const first = model.faq[0]?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(first ? { [first]: true } : {});

  return (
    <section id="duvidas" data-sec="duvidas" className={styles.section} aria-labelledby="duvidas-title">
      <div className={styles.container}>
        <SectionHeading id="duvidas-title" title={s.title} subtitle={s.subtitle} />
        <div data-reveal="" className={styles.list}>
          {model.faq.map((f) => {
            const isOpen = !!open[f.id];
            const draft = f.status === 'draft';
            return (
              <div key={f.id} className={styles.item} data-draft={draft || undefined}>
                <h3 className={styles.qWrap}>
                  <button
                    type="button"
                    id={`faq-q-${f.id}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${f.id}`}
                    className={styles.question}
                    onClick={() => setOpen((o) => ({ ...o, [f.id]: !o[f.id] }))}
                  >
                    <span className={styles.qText}>
                      {f.question}
                      {draft && <DraftBadge />}
                    </span>
                    <Icon name="add" size={22} color="var(--gold)" className={styles.plus} style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }} />
                  </button>
                </h3>
                <div
                  id={`faq-a-${f.id}`}
                  role="region"
                  aria-labelledby={`faq-q-${f.id}`}
                  className={styles.answerOuter}
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  inert={!isOpen}
                >
                  <div className={styles.answerClip}>
                    <div className={styles.answer}>
                      {parseRichText(f.answer).map((b, i) =>
                        b.type === 'paragraph' ? (
                          <p key={i}>{b.text}</p>
                        ) : (
                          <ul key={i}>
                            {b.items.map((li, j) => (
                              <li key={j}>
                                <span className={styles.bullet} />
                                {li}
                              </li>
                            ))}
                          </ul>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
