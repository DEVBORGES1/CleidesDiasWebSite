import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../components/admin/ui';
import s from '../components/admin/ui.module.css';
import { Icon } from '../components/Icon';
import { useDialog } from '../hooks/useDialog';
import { errorMessage } from '../services/http';

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel?: string;
  icon?: string;
  tone?: 'danger' | 'neutral';
}

/** Editor da página atual: o cabeçalho usa para salvar/descartar e avisar sobre alterações pendentes. */
export interface PageEditor {
  dirty: boolean;
  saving: boolean;
  save: () => Promise<void>;
  discard: () => void;
  /** Leitura sempre atualizada (usada pelo bloqueio de navegação logo após salvar). */
  isDirty?: () => boolean;
}

interface AdminContextValue {
  confirm(options: ConfirmOptions): Promise<boolean>;
  toast(message: string, kind?: 'success' | 'error' | 'info'): void;
  editor: PageEditor | null;
  registerEditor(editor: PageEditor | null): void;
  /** Invalida os dados do site e atualiza a prévia. */
  refreshSite(): void;
  /** Executa uma ação mostrando toast de sucesso ou de erro. */
  run<T>(action: () => Promise<T>, success?: string): Promise<T | undefined>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const ref = useDialog<HTMLDivElement>(true, () => onClose(false));
  const danger = options.tone !== 'neutral';
  return (
    <div className={s.backdrop} onClick={() => onClose(false)}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" tabIndex={-1} className={s.dialog} onClick={(e) => e.stopPropagation()}>
        <span className={s.dialogIcon} style={danger ? undefined : { background: '#F3E9D8', color: 'var(--primary)' }}>
          <Icon name={options.icon ?? (danger ? 'delete' : 'help')} size={22} />
        </span>
        <div>
          <h2 id="confirm-title" className={s.dialogTitle}>
            {options.title}
          </h2>
          {options.text && <p className={s.dialogText}>{options.text}</p>}
        </div>
        <div className={s.dialogActions}>
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => onClose(true)}>
            {options.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminProvider({ children, previewFrame }: { children: ReactNode; previewFrame: React.RefObject<HTMLIFrameElement | null> }) {
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const [toastState, setToastState] = useState<{ message: string; kind: 'success' | 'error' | 'info' } | null>(null);
  const [editor, setEditor] = useState<PageEditor | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'success') => {
    clearTimeout(toastTimer.current);
    setToastState({ message, kind });
    toastTimer.current = setTimeout(() => setToastState(null), kind === 'error' ? 6000 : 3600);
  }, []);

  const refreshSite = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['site'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    previewFrame.current?.contentWindow?.postMessage({ type: 'cleides:refresh' }, window.location.origin);
  }, [queryClient, previewFrame]);

  const value = useMemo<AdminContextValue>(
    () => ({
      confirm: (options) => new Promise<boolean>((resolve) => setConfirmState({ options, resolve })),
      toast,
      editor,
      registerEditor: setEditor,
      refreshSite,
      async run(action, success) {
        try {
          const result = await action();
          if (success) toast(success);
          refreshSite();
          return result;
        } catch (err) {
          toast(errorMessage(err), 'error');
          return undefined;
        }
      },
    }),
    [toast, editor, refreshSite],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      {confirmState && (
        <ConfirmDialog
          options={confirmState.options}
          onClose={(ok) => {
            confirmState.resolve(ok);
            setConfirmState(null);
          }}
        />
      )}
      {toastState && (
        <div role="status" aria-live="polite" className={`${s.toast} ${toastState.kind === 'error' ? s.toastError : ''}`}>
          <Icon name={toastState.kind === 'error' ? 'error' : toastState.kind === 'info' ? 'info' : 'check_circle'} size={20} />
          <span>{toastState.message}</span>
        </div>
      )}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin precisa estar dentro de <AdminProvider>.');
  return ctx;
}

/** Registra o editor da página para os botões "Salvar" e "Descartar" do topo. */
export function useRegisterEditor(editor: PageEditor): void {
  const { registerEditor } = useAdmin();
  const ref = useRef(editor);
  ref.current = editor;
  const { dirty, saving } = editor;
  useEffect(() => {
    registerEditor({ dirty, saving, save: () => ref.current.save(), discard: () => ref.current.discard(), isDirty: () => ref.current.dirty });
  }, [dirty, saving, registerEditor]);
  useEffect(() => () => registerEditor(null), [registerEditor]);
}
