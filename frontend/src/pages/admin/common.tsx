import type { ImageValue, SectionKey, SiteSections, SiteSettings, SiteSettingsUpdate } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { Alert, Button, Spinner } from '../../components/admin/ui';
import { useAdmin, useRegisterEditor, type PageEditor } from '../../contexts/AdminContext';
import { adminKeys, useSections, useSettings } from '../../hooks/useAdminData';
import { useDraft } from '../../hooks/useDraft';
import { adminApi } from '../../services/api';
import { ApiError, errorMessage } from '../../services/http';
import { toImageInput } from '../../services/uploads';
import styles from './common.module.css';

export function PageHeader({
  group,
  title,
  description,
  action,
}: {
  group: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        <span className={styles.group}>{group}</span>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className={styles.loading} role="status">
      <Spinner size={28} />
      <span>Carregando…</span>
    </div>
  );
}

export function PageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert tone="error" icon="error">
      {errorMessage(error)}{' '}
      <Button variant="ghost" onClick={onRetry}>
        Tentar novamente
      </Button>
    </Alert>
  );
}

export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.back} onClick={onClick}>
      <Icon name="arrow_back" size={18} />
      {children}
    </button>
  );
}

/** Converte imagens (com URL) para o formato aceito pela API. */
function serialize<T extends object>(value: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => {
      const img = v as ImageValue | null;
      if (img && typeof img === 'object' && 'url' in img && 'assetId' in img) return [k, toImageInput(img)];
      return [k, v];
    }),
  );
}

export interface FormEditor<T> extends PageEditor {
  value: T | undefined;
  patch: (p: Partial<T>) => void;
  errors: ApiError | null;
}

/** Edição de uma seção do site (textos e imagens), salva pelo botão do topo. */
export function useSectionEditor<K extends SectionKey>(key: K): FormEditor<SiteSections[K]> & { loading: boolean; error: unknown } {
  const query = useSections();
  const queryClient = useQueryClient();
  const { refreshSite } = useAdmin();
  const d = useDraft<SiteSections[K]>(query.data?.[key]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ApiError | null>(null);

  const save = useCallback(async () => {
    if (!d.draft) return;
    setSaving(true);
    setErrors(null);
    try {
      const saved = await adminApi.sections.update(key, serialize(d.draft) as never);
      d.commit(saved);
      queryClient.setQueryData<SiteSections>(adminKeys.sections, (old) => (old ? { ...old, [key]: saved } : old));
      refreshSite();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [d, key, queryClient, refreshSite]);

  return { value: d.draft, patch: d.patch, dirty: d.dirty, saving, save, discard: d.reset, errors, loading: query.isPending, error: query.error };
}

/** Edição das configurações gerais, salva pelo botão do topo. */
export function useSettingsEditor(): FormEditor<SiteSettings> & { loading: boolean; error: unknown } {
  const query = useSettings();
  const queryClient = useQueryClient();
  const { refreshSite } = useAdmin();
  const d = useDraft<SiteSettings>(query.data);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ApiError | null>(null);

  const save = useCallback(async () => {
    if (!d.draft) return;
    setSaving(true);
    setErrors(null);
    try {
      const { updatedAt: _u, ...rest } = d.draft;
      const saved = await adminApi.settings.update(serialize(rest) as SiteSettingsUpdate);
      d.commit(saved);
      queryClient.setQueryData(adminKeys.settings, saved);
      refreshSite();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [d, queryClient, refreshSite]);

  return { value: d.draft, patch: d.patch, dirty: d.dirty, saving, save, discard: d.reset, errors, loading: query.isPending, error: query.error };
}

/** Erro já comunicado à usuária (não precisa de outro aviso). */
export class HandledError extends Error {}

/** Junta vários editores da mesma página em um só (para o botão "Salvar" do topo). */
export function usePageEditors(...editors: PageEditor[]): void {
  const { toast } = useAdmin();
  const dirty = editors.some((e) => e.dirty);
  const saving = editors.some((e) => e.saving);
  useRegisterEditor({
    dirty,
    saving,
    async save() {
      try {
        for (const e of editors) if (e.dirty) await e.save();
        toast('Alterações salvas e publicadas no site.');
      } catch (err) {
        if (err instanceof HandledError) return;
        toast(err instanceof ApiError && err.code === 'VALIDATION_ERROR' ? 'Confira os campos destacados.' : errorMessage(err), 'error');
      }
    },
    discard() {
      editors.forEach((e) => e.discard());
    },
  });
}
