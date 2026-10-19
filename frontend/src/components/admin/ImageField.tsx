import { IMAGE_RATIOS, IMAGE_UPLOAD_RULES, imageAspect, type ImageRatio, type ImageValue, type UploadPurpose } from '@cleides/shared';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useMediaStatus } from '../../hooks/useAdminData';
import { cdnUrl } from '../../lib/cdn';
import { errorMessage } from '../../services/http';
import { imageFromAsset, uploadImage } from '../../services/uploads';
import { Icon } from '../Icon';
import { Button, Spinner, TextField } from './ui';
import styles from './ImageField.module.css';

interface Props {
  value: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  purpose: UploadPurpose;
  /** Proporção do quadro (ex.: "4/3"); "auto" usa a proporção da foto ou o formato escolhido. */
  frame?: string;
  maxHeight?: number;
  showAlt?: boolean;
  allowRatio?: boolean;
  allowRemove?: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function frameAspect(frame: string | undefined, value: ImageValue | null, allowRatio: boolean): number {
  if (allowRatio && value && value.ratio !== 'auto') return imageAspect(value, 4 / 3);
  if (frame && frame !== 'auto') {
    const [w, h] = frame.split('/').map(Number);
    return w && h ? w / h : 4 / 3;
  }
  return imageAspect(value, 4 / 3);
}

export function ImageField({ value, onChange, purpose, frame = '4/3', maxHeight = 300, showAlt = true, allowRatio = false, allowRemove = true }: Props) {
  const media = useMediaStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [over, setOver] = useState(false);
  const [framing, setFraming] = useState(false);
  const [askRemove, setAskRemove] = useState(false);

  const enabled = media.data?.enabled !== false;
  const ar = frameAspect(frame, value, allowRatio);
  const has = !!value?.url;
  const pos = value ? `${clamp(value.x, 0, 100).toFixed(1)}% ${clamp(value.y, 0, 100).toFixed(1)}%` : '50% 50%';

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!enabled) {
      setError('O envio de fotos ainda não foi configurado (Cloudinary).');
      return;
    }
    setError('');
    setAskRemove(false);
    setBusy(0);
    try {
      const asset = await uploadImage(file, purpose, (pct) => setBusy(pct));
      onChange({ ...imageFromAsset(asset, value?.alt ?? ''), ratio: value?.ratio ?? 'auto' });
      setOk(true);
      setTimeout(() => setOk(false), 2400);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!framing || !value) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: value.x, oy: value.y };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box || !value) return;
    const k = 100 / Math.max(1, value.zoom);
    onChange({
      ...value,
      x: clamp(d.ox - ((e.clientX - d.x) / box.clientWidth) * k, 0, 100),
      y: clamp(d.oy - ((e.clientY - d.y) / box.clientHeight) * k, 0, 100),
    });
  };
  const endDrag = () => (drag.current = null);

  return (
    <div className={styles.root}>
      <div
        ref={boxRef}
        className={styles.box}
        data-has={has || undefined}
        data-over={over || undefined}
        data-framing={framing || undefined}
        style={{ width: `min(100%, ${Math.round(maxHeight * ar)}px)`, aspectRatio: ar.toFixed(4) }}
        role={has ? undefined : 'button'}
        tabIndex={has ? -1 : 0}
        aria-label={has ? undefined : 'Selecionar foto'}
        onClick={() => !has && !busy && fileRef.current?.click()}
        onKeyDown={(e) => {
          if (!has && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files[0]);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {has && (
          <img
            src={cdnUrl(value.url, 1200)}
            alt=""
            draggable={false}
            className={styles.img}
            style={{ objectPosition: pos, transform: `scale(${value.zoom})`, transformOrigin: pos }}
          />
        )}
        {framing && (
          <>
            <span className={styles.gridV1} />
            <span className={styles.gridV2} />
            <span className={styles.gridH1} />
            <span className={styles.gridH2} />
            <span className={styles.dragHint}>
              <Icon name="pan_tool" size={16} />
              Arraste a foto para reposicionar
            </span>
          </>
        )}
        {!has && busy === null && (
          <div className={styles.empty}>
            <Icon name={over ? 'download' : 'add_photo_alternate'} size={30} color="var(--primary)" />
            <span className={styles.emptyTitle}>{over ? 'Solte para enviar' : 'Arraste uma foto para cá'}</span>
            <span className={styles.emptyBtn}>Selecionar arquivo</span>
            <span className={styles.emptyHint}>JPG, PNG ou WEBP · até {IMAGE_UPLOAD_RULES.maxMegabytes} MB</span>
          </div>
        )}
        {has && over && <div className={styles.replaceOver}>Solte para substituir a foto</div>}
        {busy !== null && (
          <div className={styles.busy} role="status">
            <Spinner size={26} />
            Enviando foto… {busy}%
            <span className={styles.progress}>
              <span style={{ width: `${busy}%` }} />
            </span>
          </div>
        )}
        {ok && (
          <span className={styles.ok} role="status">
            <Icon name="check_circle" size={16} />
            Foto enviada
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className={styles.error}>
          <Icon name="error" size={18} />
          <span>{error}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setError('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {has && !framing && busy === null && (
        <div className={styles.tools}>
          <Button icon="crop" onClick={() => setFraming(true)}>
            Ajustar enquadramento
          </Button>
          <Button icon="sync" onClick={() => fileRef.current?.click()}>
            Substituir
          </Button>
          {allowRemove &&
            (askRemove ? (
              <span className={styles.ask}>
                Remover esta foto?
                <Button variant="dangerGhost" onClick={() => onChange(null)}>
                  Remover
                </Button>
                <Button variant="ghost" onClick={() => setAskRemove(false)}>
                  Cancelar
                </Button>
              </span>
            ) : (
              <Button variant="dangerGhost" icon="delete" onClick={() => setAskRemove(true)}>
                Remover
              </Button>
            ))}
        </div>
      )}

      {framing && value && (
        <div className={styles.framePanel}>
          <label className={styles.zoomRow}>
            <span className={styles.zoomLabel}>Zoom</span>
            <Icon name="zoom_out" size={18} />
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.01}
              value={value.zoom}
              aria-label="Zoom da foto"
              onChange={(e) => onChange({ ...value, zoom: Number(e.target.value) })}
            />
            <Icon name="zoom_in" size={18} />
            <span className={styles.zoomPct}>{Math.round(value.zoom * 100)}%</span>
          </label>
          {allowRatio && (
            <div className={styles.ratioRow}>
              <span className={styles.zoomLabel}>Formato</span>
              <div className={styles.ratios} role="group" aria-label="Formato da foto">
                {IMAGE_RATIOS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={value.ratio === r.key}
                    className={styles.ratio}
                    onClick={() => onChange({ ...value, ratio: r.key as ImageRatio })}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={styles.frameActions}>
            <Button icon="center_focus_strong" onClick={() => onChange({ ...value, x: 50, y: 50, zoom: 1 })}>
              Centralizar
            </Button>
            <Button variant="primary" icon="check" onClick={() => setFraming(false)}>
              Concluir
            </Button>
          </div>
        </div>
      )}

      {showAlt && has && (
        <TextField
          label={
            <>
              Descrição da foto <span className={styles.altNote}>· acessibilidade</span>
            </>
          }
          value={value.alt}
          maxLength={300}
          placeholder="Ex.: Bebê sorrindo ao lado da árvore de Natal"
          hint="Lida por leitores de tela e pelo Google. Descreva o que aparece na foto."
          onChange={(alt) => onChange({ ...value, alt })}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_UPLOAD_RULES.accept}
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
