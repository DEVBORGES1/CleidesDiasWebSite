import type { PublicationStatus } from '@cleides/shared';
import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from '../Icon';
import s from './ui.module.css';

export const uiStyles = s;

export function Card({ title, description, children, className }: { title?: string; description?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={`${s.card} ${className ?? ''}`}>
      {(title || description) && (
        <div className={s.cardHead}>
          {title && <h3 className={s.cardTitle}>{title}</h3>}
          {description && <p className={s.cardDesc}>{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

interface FieldShellProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {children({ id, describedBy: [errId, hintId].filter(Boolean).join(' ') || undefined, invalid: !!error })}
      {error && (
        <span id={errId} role="alert" className={s.error}>
          <Icon name="error" size={16} />
          {error}
        </span>
      )}
      {hint && (
        <span id={hintId} className={s.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  serif?: boolean;
};

export function TextField({ label, value, onChange, hint, error, serif, className, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="text"
          {...rest}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={`${s.input} ${serif ? s.serifInput : ''} ${className ?? ''}`}
        />
      )}
    </FieldShell>
  );
}

export function MoneyField({ label, value, onChange, hint, error, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <div className={s.money}>
          <span className={s.moneyPrefix} aria-hidden="true">
            R$
          </span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            {...rest}
            value={value}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
            className={s.input}
          />
        </div>
      )}
    </FieldShell>
  );
}

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  toolbar?: ReactNode;
};

export function TextAreaField({ label, value, onChange, hint, error, toolbar, rows = 3, ...rest }: AreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <>
          {toolbar}
          <textarea
            id={id}
            rows={rows}
            {...rest}
            value={value}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
            className={s.textarea}
          />
        </>
      )}
    </FieldShell>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: ReactNode;
};

export function SelectField({ label, value, onChange, options, hint, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint}>
      {({ id, describedBy }) => (
        <select id={id} {...rest} value={value} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} className={s.select}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

type Variant = 'primary' | 'outline' | 'soft' | 'ghost' | 'danger' | 'dangerGhost' | 'dashed';

export function Button({
  variant = 'outline',
  icon,
  loading,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: string; loading?: boolean }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || loading} className={`${s.btn} ${s[variant]} ${className ?? ''}`}>
      {loading ? <Spinner size={16} /> : icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={`${s.iconBtn} ${rest.className ?? ''}`}>
      <Icon name={icon} size={19} />
    </button>
  );
}

export function StatusPill({ status, feminine }: { status: PublicationStatus; feminine?: boolean }) {
  const published = status === 'published';
  return (
    <span className={`${s.pill} ${published ? s.pillPublished : s.pillDraft}`}>
      <span className={s.pillDot} />
      {published ? (feminine ? 'Publicada' : 'Publicado') : 'Rascunho'}
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={s.switch} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function SwitchRow({ title, help, checked, onChange }: { title: string; help?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={s.switchRow}>
      <span className={s.switchText}>
        <span className={s.switchTitle}>{title}</span>
        {help && <span className={s.switchHelp}>{help}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function Collapsible({ title, description, icon = 'text_fields', children, defaultOpen = false }: { title: string; description?: string; icon?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={`${s.card} ${s.collapsible}`}>
      <button type="button" className={s.collapseBtn} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Icon name={icon} size={20} color="var(--primary)" />
        <span className={s.collapseText}>
          <span className={s.cardTitle}>{title}</span>
          {description && <span className={s.cardDesc}>{description}</span>}
        </span>
        <Icon name="expand_more" size={22} style={{ transition: 'transform .25s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div id={id} className={s.collapseBody}>
          {children}
        </div>
      )}
    </section>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Icon name={icon} size={26} />
      </span>
      <span className={s.emptyTitle}>{title}</span>
      {text && <span className={s.emptyText}>{text}</span>}
      {action}
    </div>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return <span className={s.spinner} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function Alert({ children, tone = 'warning', icon = 'info' }: { children: ReactNode; tone?: 'warning' | 'error'; icon?: string }) {
  return (
    <div className={`${s.alert} ${tone === 'error' ? s.alertError : ''}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} size={18} style={{ flex: 'none', marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

/** Lista simples de textos com reordenação (diferenciais, itens incluídos, palavras da faixa...). */
export function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  max = 12,
  itemLabel = 'Item',
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel: string;
  max?: number;
  itemLabel?: string;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onChange(next);
  };
  return (
    <div className={s.list}>
      {items.map((v, i) => (
        <div key={i} className={s.listRow}>
          <span className={s.listNum} aria-hidden="true">
            {i + 1}
          </span>
          <input
            type="text"
            value={v}
            placeholder={placeholder}
            aria-label={`${itemLabel} ${i + 1}`}
            className={s.input}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <IconButton icon="arrow_upward" label="Mover para cima" disabled={i === 0} onClick={() => move(i, i - 1)} />
          <IconButton icon="arrow_downward" label="Mover para baixo" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} />
          <IconButton icon="close" label="Remover" onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      {items.length < max && (
        <Button variant="dashed" icon="add" onClick={() => onChange([...items, ''])}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}

export function Datalist({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  );
}

/** Opções do seletor "Posição no site". */
export function positionOptions(count: number) {
  return Array.from({ length: count }, (_, i) => ({ value: String(i), label: `${i + 1}º lugar` }));
}
