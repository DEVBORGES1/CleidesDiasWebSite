import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { SEC_TO_PATH } from '../../layouts/adminNav';
import { Icon } from '../Icon';
import { IconButton } from './ui';
import styles from './PreviewPane.module.css';

const MOBILE = { w: 390, h: 844 };
const DESKTOP_W = 1280;

interface Props {
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  /** Seção do site relacionada à página aberta no painel. */
  sec?: string;
  onHide: () => void;
}

/** Prévia ao vivo do site (com rascunhos marcados), ao lado do editor. */
export function PreviewPane({ frameRef, sec, onHide }: Props) {
  const navigate = useNavigate();
  const paneRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile');
  const [drafts, setDrafts] = useState(true);
  const [pick, setPick] = useState(false);
  const [size, setSize] = useState({ w: 420, h: 760 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const post = (msg: object) => frameRef.current?.contentWindow?.postMessage(msg, window.location.origin);

  useEffect(() => {
    if (loaded && sec) post({ type: 'cleides:goto', sec });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, loaded]);

  useEffect(() => {
    if (loaded) post({ type: 'cleides:pick-mode', on: pick });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, loaded]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'cleides:picked') return;
      const path = SEC_TO_PATH[String(e.data.sec)];
      setPick(false);
      if (path) navigate(path);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  const pad = 32;
  const frameW = mode === 'mobile' ? MOBILE.w : DESKTOP_W;
  const frameH = mode === 'mobile' ? MOBILE.h : Math.round(((size.h - pad) / Math.max(1, size.w - pad)) * DESKTOP_W);
  const scale = Math.min((size.w - pad) / frameW, (size.h - pad) / frameH, 1);

  return (
    <section aria-label="Prévia do site" className={styles.pane}>
      <div className={styles.bar}>
        <span className={styles.title}>
          <span className={styles.dot} />
          Prévia
        </span>
        <div className={styles.tools}>
          <div role="group" aria-label="Tamanho da prévia" className={styles.segment}>
            <button type="button" aria-pressed={mode === 'mobile'} aria-label="Celular" title="Celular" onClick={() => setMode('mobile')}>
              <Icon name="smartphone" size={18} />
            </button>
            <button type="button" aria-pressed={mode === 'desktop'} aria-label="Computador" title="Computador" onClick={() => setMode('desktop')}>
              <Icon name="desktop_windows" size={18} />
            </button>
          </div>
          <button type="button" className={styles.toggle} aria-pressed={drafts} title="Mostrar também os itens em rascunho na prévia" onClick={() => { setLoaded(false); setDrafts((d) => !d); }}>
            <Icon name="edit_note" size={18} />
            Rascunhos
          </button>
          <button type="button" className={styles.toggle} aria-pressed={pick} title="Clique em uma parte do site para abrir o editor dela" onClick={() => setPick((p) => !p)}>
            <Icon name="ads_click" size={18} />
            Selecionar
          </button>
          <IconButton icon="close" label="Esconder prévia" onClick={onHide} />
        </div>
      </div>
      <div ref={paneRef} className={styles.stage}>
        <div
          className={styles.device}
          data-mode={mode}
          style={{ width: frameW, height: frameH, transform: `scale(${scale})` }}
        >
          <iframe
            ref={frameRef}
            key={String(drafts)}
            src={drafts ? '/?preview=1' : '/'}
            title="Prévia do site"
            className={styles.frame}
            onLoad={() => setTimeout(() => setLoaded(true), 600)}
          />
        </div>
        {pick && (
          <span className={styles.pickHint}>
            <Icon name="ads_click" size={16} />
            Clique em uma parte do site para editar
          </span>
        )}
      </div>
    </section>
  );
}
