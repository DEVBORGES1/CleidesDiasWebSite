import { CONTENT_LIMITS, addDays, formatDayMonth, formatPrice, lotPriceFor, todayIn, withLotPhases } from '@cleides/shared/utils';
import type { LotPhase, PriceLot, PublicationStatus } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button, Collapsible, EmptyState, IconButton, MoneyField, StatusPill, SwitchRow, TextField, uiStyles } from '../../components/admin/ui';
import { useAdmin } from '../../contexts/AdminContext';
import { adminKeys, useLots, usePackages } from '../../hooks/useAdminData';
import { adminApi } from '../../services/api';
import { ApiError, errorMessage } from '../../services/http';
import { HandledError, PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor } from './common';
import forms from './forms.module.css';
import styles from './list.module.css';

const EMPTY: PriceLot[] = [];
const NEW_ID = 'novo';

export const LOT_PHASE_LABEL: Record<LotPhase, string> = { ended: 'Encerrado', current: 'Valendo agora', upcoming: 'Em breve' };
const PHASE_ICON: Record<LotPhase, string> = { ended: 'check', current: 'star', upcoming: 'schedule' };

/** Preço digitado no painel ("1.290,50") → número; vazio vira `null`. */
const parsePrice = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
};
const priceText = (v: number | null) => (v == null ? '' : formatPrice(v).replace(/\./g, ''));

interface LotForm {
  name: string;
  endsOn: string;
  prices: Record<string, string>;
  status: PublicationStatus;
}

export function LotsPage() {
  const query = useLots();
  const packagesQuery = usePackages();
  const queryClient = useQueryClient();
  const { confirm, toast, refreshSite } = useAdmin();
  const section = useSectionEditor('lots');
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<LotForm | null>(null);
  const [initial, setInitial] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ApiError | null>(null);
  const items = query.data ?? EMPTY;
  const packages = packagesQuery.data ?? [];
  const today = todayIn();
  const phased = withLotPhases(items, today);
  const formDirty = !!form && JSON.stringify(form) !== initial;

  usePageEditors(section, {
    dirty: formDirty,
    saving,
    save: async () => {
      if (!(await save())) throw new HandledError();
    },
    discard: () => {
      setOpenId(null);
      setForm(null);
    },
  });

  const afterChange = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
    refreshSite();
  };

  async function guardDiscard() {
    if (!formDirty) return true;
    return confirm({ title: 'Descartar alterações?', text: 'O lote aberto tem alterações não salvas.', confirmLabel: 'Descartar', icon: 'warning' });
  }

  async function open(item: PriceLot | null) {
    if (!(await guardDiscard())) return;
    if (item && openId === item.id) {
      setOpenId(null);
      setForm(null);
      return;
    }
    const last = phased.at(-1);
    const f: LotForm = item
      ? {
          name: item.name,
          endsOn: item.endsOn,
          prices: Object.fromEntries(packages.map((p) => [p.id, priceText(lotPriceFor(item, p.id))])),
          status: item.status,
        }
      : {
          name: `${items.length + 1}º lote`,
          endsOn: addDays(last && last.endsOn > today ? last.endsOn : today, 30),
          prices: Object.fromEntries(packages.map((p) => [p.id, ''])),
          status: 'published',
        };
    setErrors(null);
    setForm(f);
    setInitial(JSON.stringify(f));
    setOpenId(item ? item.id : NEW_ID);
  }

  async function close() {
    if (!(await guardDiscard())) return;
    setOpenId(null);
    setForm(null);
  }

  // ?abrir=<id> abre um lote (atalho do painel inicial); espera os pacotes para preencher os valores.
  useEffect(() => {
    const target = params.get('abrir');
    if (!target || !query.data || !packagesQuery.data) return;
    const item = query.data.find((l) => l.id === target);
    if (item) void open(item);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, query.data, packagesQuery.data]);

  async function save(): Promise<boolean> {
    if (!form) return true;
    setSaving(true);
    setErrors(null);
    try {
      const body = {
        name: form.name,
        endsOn: form.endsOn,
        prices: Object.entries(form.prices).map(([packageId, v]) => ({ packageId, price: parsePrice(v) })),
        status: form.status,
      };
      if (openId === NEW_ID) await adminApi.lots.create(body);
      else await adminApi.lots.update(openId!, body);
      queryClient.setQueryData(adminKeys.lots, await adminApi.lots.list());
      afterChange();
      setOpenId(null);
      setForm(null);
      toast(form.status === 'published' ? 'Lote salvo e publicado no site.' : 'Lote salvo como rascunho.');
      return true;
    } catch (err) {
      if (err instanceof ApiError) setErrors(err);
      toast(errorMessage(err), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: PriceLot) {
    if (!(await confirm({ title: 'Excluir este lote?', text: `“${item.name}” e os valores dos pacotes nele serão removidos. Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir lote' }))) return;
    try {
      await adminApi.lots.remove(item.id);
      queryClient.setQueryData(adminKeys.lots, items.filter((l) => l.id !== item.id));
      if (openId === item.id) {
        setOpenId(null);
        setForm(null);
      }
      afterChange();
      toast('Lote excluído.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  const overlap = form && items.some((l) => l.id !== openId && l.endsOn === form.endsOn);
  const editor = form && (
    <div className={styles.editor}>
      <div className={uiStyles.grid2}>
        <TextField label="Nome do lote" value={form.name} maxLength={40} placeholder="Ex.: 1º lote" onChange={(name) => setForm({ ...form, name })} error={errors?.field('name')} />
        <TextField
          label="Vale até (inclusive)"
          type="date"
          value={form.endsOn}
          onChange={(endsOn) => setForm({ ...form, endsOn })}
          error={overlap ? 'Já existe um lote que termina nesse dia.' : errors?.field('endsOn')}
          hint="O lote seguinte começa no dia depois desta data."
        />
      </div>
      <div className={forms.subhead}>
        <span className={forms.subheadTitle}>Valor de cada pacote neste lote</span>
        <span className={forms.subheadText}>Enquanto o lote estiver valendo, este valor aparece no lugar do preço do pacote. Deixe em branco para manter o preço normal.</span>
      </div>
      {packages.length === 0 ? (
        <p className={forms.subheadText}>
          Nenhum pacote cadastrado ainda. <Link to="/admin/pacotes/novo">Criar pacote</Link>
        </p>
      ) : (
        <div className={uiStyles.grid2}>
          {packages.map((p) => (
            <MoneyField
              key={p.id}
              label={p.name}
              value={form.prices[p.id] ?? ''}
              placeholder={p.price != null ? priceText(p.promoPrice ?? p.price) : '0'}
              hint={p.price != null ? `Preço normal: R$ ${formatPrice(p.promoPrice ?? p.price)}` : undefined}
              onChange={(v) => setForm({ ...form, prices: { ...form.prices, [p.id]: v } })}
            />
          ))}
        </div>
      )}
      <SwitchRow
        title="Mostrar no site"
        help={form.status === 'published' ? 'O lote aparece na seção “Valores por lote” e muda o preço dos pacotes enquanto estiver valendo.' : 'Fica salvo como rascunho, só no painel e na pré-visualização.'}
        checked={form.status === 'published'}
        onChange={(on) => setForm({ ...form, status: on ? 'published' : 'draft' })}
      />
      <div className={styles.editorFooter}>
        {openId !== NEW_ID ? (
          <Button variant="dangerGhost" icon="delete" onClick={() => void remove(items.find((l) => l.id === openId)!)}>
            Excluir lote
          </Button>
        ) : (
          <span />
        )}
        <div className={styles.editorButtons}>
          <Button variant="outline" onClick={() => void close()}>
            Cancelar
          </Button>
          <Button variant="primary" icon="check" loading={saving} onClick={() => void save()}>
            Salvar lote
          </Button>
        </div>
      </div>
    </div>
  );

  const pending = query.isPending || packagesQuery.isPending;
  const error = query.error ?? packagesQuery.error;
  const t = section.value;

  return (
    <>
      <PageHeader
        group="Vendas e serviços"
        title="Valores por lote"
        description="Preços que mudam com o prazo, como “1º lote até 31/10”. O site mostra o lote que está valendo hoje e troca de lote sozinho quando a data passa."
        action={
          <Button variant="primary" icon="add" disabled={items.length >= CONTENT_LIMITS.lots || pending} onClick={() => void open(null)}>
            Adicionar lote
          </Button>
        }
      />
      {pending && <PageLoading />}
      {error && <PageError error={error} onRetry={() => void (query.refetch(), packagesQuery.refetch())} />}
      {!pending && !error && (
        <>
          {phased.length > 0 && (
            <ol className={styles.list} aria-label="Lotes">
              {phased.map((lot) => {
                const isOpen = openId === lot.id;
                const priced = packages.filter((p) => lotPriceFor(lot, p.id) != null);
                return (
                  <li key={lot.id} className={styles.item} data-open={isOpen || undefined}>
                    <div className={styles.row}>
                      <span className={styles.circleIcon} aria-hidden="true">
                        <Icon name={PHASE_ICON[lot.phase]} size={22} />
                      </span>
                      <button type="button" className={styles.main} aria-expanded={isOpen} onClick={() => void open(lot)}>
                        <span className={styles.mainTitle}>
                          {lot.name} · {lot.startsOn ? `de ${formatDayMonth(lot.startsOn)} a ${formatDayMonth(lot.endsOn)}` : `até ${formatDayMonth(lot.endsOn)}`}
                        </span>
                        <span className={styles.mainText}>
                          {LOT_PHASE_LABEL[lot.phase]} ·{' '}
                          {priced.length === 0
                            ? 'nenhum pacote com valor'
                            : priced.map((p) => `${p.name} R$ ${formatPrice(lotPriceFor(lot, p.id))}`).join(' · ')}
                        </span>
                      </button>
                      <span className={styles.rowActions}>
                        <StatusPill status={lot.status} />
                        <IconButton icon={isOpen ? 'close' : 'edit'} label={isOpen ? 'Fechar edição' : 'Editar'} onClick={() => void open(lot)} />
                        <IconButton icon="delete" label="Excluir" onClick={() => void remove(lot)} />
                      </span>
                    </div>
                    {isOpen && editor}
                  </li>
                );
              })}
            </ol>
          )}
          {openId === NEW_ID && (
            <div className={styles.item} data-open="">
              <div className={styles.row}>
                <span className={styles.mainTitle}>Novo lote</span>
              </div>
              {editor}
            </div>
          )}
          {items.length > 0 && openId !== NEW_ID && (
            <Button variant="dashed" icon="add" disabled={items.length >= CONTENT_LIMITS.lots} onClick={() => void open(null)}>
              Adicionar lote
            </Button>
          )}
          {items.length === 0 && openId !== NEW_ID && (
            <EmptyState
              icon="confirmation_number"
              title="Nenhum lote cadastrado"
              text="Crie o primeiro lote, por exemplo “1º lote” valendo até 31/10, e informe o valor de cada pacote nele."
              action={
                <Button variant="primary" icon="add" onClick={() => void open(null)}>
                  Adicionar lote
                </Button>
              }
            />
          )}
        </>
      )}
      {t && (
        <Collapsible title="Textos da seção" description="Título, subtítulo e aviso da seção “Valores por lote”, que aparece abaixo de “Como funciona”.">
          <div className={uiStyles.grid2}>
            <TextField label="Título" value={t.title} maxLength={80} onChange={(title) => section.patch({ title })} />
            <TextField label="Subtítulo" value={t.subtitle} maxLength={160} onChange={(subtitle) => section.patch({ subtitle })} />
          </div>
          <TextField label="Aviso abaixo da tabela" value={t.note} maxLength={200} onChange={(note) => section.patch({ note })} />
        </Collapsible>
      )}
    </>
  );
}
