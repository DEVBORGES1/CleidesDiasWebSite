import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useMediaQuery';
import type { SiteModel } from '../../pages/public/siteModel';
import { cdnUrl } from '../../lib/cdn';
import { Icon } from '../Icon';
import { DraftBadge, Ornament } from './Ornament';
import styles from './HowSection.module.css';

const MINUTES = [2, 3, 3, 4, 5, 6];
const timeOf = (i: number) => `10:${String(MINUTES[i] ?? 6 + i - 5).padStart(2, '0')}`;

/** Conversa de exemplo que "acontece" quando o celular aparece na tela. */
function PhoneChat({ model }: { model: SiteModel }) {
  const how = model.sections.how;
  const messages = how.chatMessages;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const avatar = model.sections.about.image;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((x) => x.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (reduce) {
      setShown(messages.length);
      return;
    }
    if (shown >= messages.length) return;
    const t = setTimeout(() => {
      if (!messages[shown]?.fromClient && !typing) setTyping(true);
      else {
        setTyping(false);
        setShown((n) => n + 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [started, shown, typing, reduce, messages]);

  return (
    <div ref={ref} data-reveal="" className={styles.phoneWrap}>
      <div className={styles.phone}>
        <span aria-hidden="true" className={styles.btnL1} />
        <span aria-hidden="true" className={styles.btnL2} />
        <span aria-hidden="true" className={styles.btnL3} />
        <span aria-hidden="true" className={styles.btnR} />
        <div className={styles.screen}>
          <div aria-hidden="true" className={styles.status}>
            <span>10:02</span>
            <span className={styles.island} />
            <span className={styles.statusIcons}>
              <span className={styles.bars}>
                <span style={{ height: 4 }} />
                <span style={{ height: 6 }} />
                <span style={{ height: 8 }} />
                <span style={{ height: 11 }} />
              </span>
              <span className={styles.battery}>
                <span />
              </span>
            </span>
          </div>
          <div className={styles.chatHead} aria-hidden="true">
            <span className={styles.avatar}>
              {avatar?.url && (
                <img src={cdnUrl(avatar.url, 120)} alt="" style={{ objectPosition: `${avatar.x}% ${Math.min(avatar.y, 22)}%` }} />
              )}
            </span>
            <span className={styles.chatWho}>
              <span className={styles.chatName}>{how.chatName}</span>
              <span className={styles.chatStatus}>
                <span className={styles.online} />
                {how.chatStatus}
              </span>
            </span>
          </div>
          <div className={styles.messages} aria-hidden="true">
            {messages.slice(0, shown).map((m, i) => (
              <div key={i} className={styles.bubble} data-me={m.fromClient || undefined}>
                {m.text}
                <span className={styles.time}>{timeOf(i)}</span>
              </div>
            ))}
            {typing && (
              <div className={styles.typing}>
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          {how.chatButton && (
            <a
              href={model.links.schedule}
              target={model.links.external ? '_blank' : undefined}
              rel="noopener"
              className={styles.chatCta}
            >
              {how.chatButton}
              <span className={styles.send}>
                <Icon name="send" size={19} />
              </span>
            </a>
          )}
          <div aria-hidden="true" className={styles.homeBar}>
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowSection({ model, compact }: { model: SiteModel; compact: boolean }) {
  const how = model.sections.how;
  return (
    <section data-sec="como-funciona" className={styles.section} aria-labelledby="como-title">
      <div className={styles.container}>
        <div className={styles.left}>
          <div data-reveal="" className={styles.heading} data-compact={compact || undefined}>
            <Ornament />
            <h2 id="como-title" className={styles.title}>
              {how.title}
            </h2>
            {how.subtitle && <p className={styles.subtitle}>{how.subtitle}</p>}
          </div>
          {model.steps.length > 0 && (
            <ol className={styles.steps}>
              {model.steps.map((st, i) => (
                <li key={st.id} data-reveal="" className={styles.step}>
                  <span className={styles.stepIcon} data-draft={st.status === 'draft' || undefined}>
                    <Icon name={st.icon} size={25} color="var(--gold)" />
                  </span>
                  <div className={styles.stepBody}>
                    <span className={styles.stepLabel}>
                      {how.stepPrefix} {i + 1}
                      {st.status === 'draft' && <DraftBadge />}
                    </span>
                    <h3 className={styles.stepTitle}>{st.title}</h3>
                    {st.description && <p className={styles.stepText}>{st.description}</p>}
                    {st.note && <p className={styles.stepNote}>{st.note}</p>}
                    {st.image?.url && (
                      <span className={styles.stepImage}>
                        <img
                          src={cdnUrl(st.image.url, 640)}
                          alt={st.image.alt}
                          loading="lazy"
                          style={{ objectPosition: `${st.image.x}% ${st.image.y}%`, transform: `scale(${st.image.zoom})` }}
                        />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {how.note && (
            <p className={styles.note}>
              <Icon name="event_available" size={19} color="var(--gold)" style={{ flex: 'none' }} />
              {how.note}
            </p>
          )}
        </div>
        {how.chatMessages.length > 0 && <PhoneChat model={model} />}
      </div>
    </section>
  );
}
