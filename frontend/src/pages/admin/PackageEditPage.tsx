import { CONTENT_LIMITS, HIGHLIGHT_TYPES, IMAGE_UPLOAD_RULES, formatDayMonth, formatPrice, lotPriceFor, todayIn, withLotPhases } from '@cleides/shared/utils';
import type { HighlightType, ImageValue, Package, PackageHighlight, PriceLot, PublicationStatus } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { ImageField } from '../../components/admin/ImageField';
import {
  Alert,
  Button,
  Card,
  Datalist,
  EmptyState,
  IconButton,
  ListEditor,
  MoneyField,
  SelectField,
  Spinner,
  StatusPill,
  SwitchRow,
  TextAreaField,
  TextField,
  positionOptions,
  uiStyles,
} from '../../components/admin/ui';
import { useAdmin, useRegisterEditor } from '../../contexts/AdminContext';
import { adminKeys, useLots, useMediaStatus, usePackages } from '../../hooks/useAdminData';
import { useDraft } from '../../hooks/useDraft';
import { moveTo } from '../../hooks/useDragReorder';
import { cdnUrl } from '../../lib/cdn';
import { adminApi } from '../../services/api';
import { ApiError, errorMessage } from '../../services/http';
import { imageFromAsset, toImageInput, uploadImage } from '../../services/uploads';
import { BackLink, PageError, PageHeader, PageLoading } from './common';
import { LOT_PHASE_LABEL } from './LotsPage';
import forms from './forms.module.css';
import styles from './PackageEditPage.module.css';

const EMPTY: Package[] = [];
const EMPTY_LOTS: PriceLot[] = [];

interface PackageForm {
  name: string;
  subtitle: string;
  description: string;
  category: string;
  price: string;
  promoPrice: string | null;
  cover: ImageValue | null;
  coverOnCard: boolean;
  photos: ImageValue[];
  highlights: PackageHighlight[];
  includedItems: string[];
  extraInfo: string | null;
  featured: boolean;
  status: PublicationStatus;
  position: number;
  /** Valor do pacote em cada lote (id do lote → texto digitado; vazio = preço normal). */
  lotPrices: Record<string, string>;
}

const TABS = [
  { key: 'info', label: 'Informações' },
  { key: 'fotos', label: 'Fotografias' },
  { key: 'incluido', label: 'O que está incluído' },
  { key: 'publicacao', label: 'Publicação' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const priceText = (v: number | null) => (v == null ? '' : formatPrice(v).replace(/\./g, ''));
const parsePrice = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
};

function toForm(p: Package | undefined, position: number, lots: PriceLot[]): PackageForm {
  const lotPrices = Object.fromEntries(lots.map((l) => [l.id, p ? priceText(lotPriceFor(l, p.id)) : '']));
  if (!p)
    return {
      name: '',
      subtitle: '',
      description: '',
      category: '',
      price: '',
      promoPrice: null,
      cover: null,
      coverOnCard: false,
      photos: [],
      highlights: [],
      includedItems: [],
      extraInfo: null,
      featured: false,
      status: 'draft',
      position,
      lotPrices,
    };
  return {
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    category: p.category,
    price: priceText(p.price),
    promoPrice: p.promoPrice == null ? null : priceText(p.promoPrice),
    cover: p.cover,
    coverOnCard: p.coverOnCard,
    photos: p.photos,
    highlights: p.highlights,
    includedItems: p.includedItems,
    extraInfo: p.extraInfo ? p.extraInfo : null,
    featured: p.featured,
    status: p.status,
    position,
    lotPrices,
  };
}

export function PackageEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const query = usePackages();
  const lotsQuery = useLots();
  // Sem conseguir carregar os lotes, o pacote continua editável (só sem os valores por lote).
  const lots = lotsQuery.data ?? (lotsQuery.isError ? EMPTY_LOTS : undefined);
  const media = useMediaStatus();
  const queryClient = useQueryClient();
  const { toast, refreshSite, confirm } = useAdmin();
  const items = query.data ?? EMPTY;
  const index = items.findIndex((p) => p.id === id);
  const pkg = index >= 0 ? items[index] : undefined;
  const server = useMemo(
    () => (query.data && lots ? toForm(pkg, pkg ? index : items.length, lots) : undefined),
    [query.data, lots, pkg, index, items.length],
  );
  const d = useDraft<PackageForm>(server);
  const [tab, setTab] = useState<TabKey>((params.get('etapa') as TabKey) || 'info');
  const [saving, setSaving] = useState<'primary' | 'secondary' | null>(null);
  const [errors, setErrors] = useState<ApiError | null>(null);
  const [nameErr, setNameErr] = useState(false);
  const [pending, setPending] = useState(0);
  const [photoErr, setPhotoErr] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const categories = useMemo(() => [...new Set(items.map((p) => p.category).filter(Boolean))], [items]);

  useEffect(() => {
    document.getElementById('admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  async function save(status: PublicationStatus, which: 'primary' | 'secondary'): Promise<boolean> {
    const f = d.draft;
    if (!f) return false;
    if (!f.name.trim()) {
      setNameErr(true);
      setTab('info');
      toast('Dê um nome ao pacote.', 'error');
      return false;
    }
    setSaving(which);
    setErrors(null);
    try {
      const body = {
        name: f.name,
        subtitle: f.subtitle,
        description: f.description,
        category: f.category,
        price: parsePrice(f.price),
        promoPrice: f.promoPrice == null ? null : parsePrice(f.promoPrice),
        cover: toImageInput(f.cover),
        coverOnCard: f.coverOnCard,
        photos: f.photos.map((p) => toImageInput(p)!),
        highlights: f.highlights,
        includedItems: f.includedItems,
        extraInfo: f.extraInfo ?? '',
        featured: f.featured,
        status,
      };
      const saved = isNew ? await adminApi.packages.create(body) : await adminApi.packages.update(id!, body);
      let list = await adminApi.packages.list();
      if (list.findIndex((p) => p.id === saved.id) !== f.position) list = await adminApi.packages.reorder(moveTo(list.map((p) => p.id), saved.id, f.position));
      queryClient.setQueryData(adminKeys.packages, list);
      const freshLots = await saveLotPrices(saved.id, f.lotPrices);
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      refreshSite();
      const fresh = list.find((p) => p.id === saved.id) ?? saved;
      flushSync(() => d.commit(toForm(fresh, list.indexOf(fresh), freshLots)));
      toast(status === 'published' ? (pkg?.status === 'published' ? 'Pacote atualizado no site.' : 'Pacote publicado no site!') : pkg?.status === 'published' ? 'Pacote tirado do ar (salvo como rascunho).' : 'Pacote salvo como rascunho.');
      if (isNew) navigate(`/admin/pacotes/${saved.id}`, { replace: true });
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err);
        if (err.field('price') || err.field('promoPrice') || err.field('name')) setTab('info');
      }
      toast(errorMessage(err), 'error');
      return false;
    } finally {
      setSaving(null);
    }
  }

  /** Grava nos lotes só os valores deste pacote que mudaram (os demais pacotes não são tocados). */
  async function saveLotPrices(packageId: string, edited: Record<string, string>): Promise<PriceLot[]> {
    if (Object.keys(edited).length === 0) return lots ?? EMPTY_LOTS;
    const current = await adminApi.lots.list();
    let changed = false;
    for (const lot of current) {
      // Lotes criados em outra aba depois que a página abriu não são alterados.
      if (!(lot.id in edited)) continue;
      const next = parsePrice(edited[lot.id] ?? '');
      if (next === lotPriceFor(lot, packageId)) continue;
      const prices = lot.prices.filter((x) => x.packageId !== packageId);
      if (next != null) prices.push({ packageId, price: next });
      await adminApi.lots.update(lot.id, { prices });
      changed = true;
    }
    const fresh = changed ? await adminApi.lots.list() : current;
    queryClient.setQueryData(adminKeys.lots, fresh);
    return fresh;
  }

  const currentStatus = pkg?.status ?? 'draft';
  useRegisterEditor({
    dirty: d.dirty,
    saving: saving !== null,
    save: async () => {
      await save(currentStatus, 'primary');
    },
    discard: d.reset,
  });

  async function addPhotos(files: FileList | null) {
    const f = d.draft;
    if (!files?.length || !f) return;
    setPhotoErr('');
    const room = CONTENT_LIMITS.packagePhotos - f.photos.length;
    const list = Array.from(files).slice(0, room);
    if (list.length < files.length) setPhotoErr(`Cada pacote pode ter até ${CONTENT_LIMITS.packagePhotos} fotos adicionais.`);
    setPending((n) => n + list.length);
    for (const file of list) {
      try {
        const asset = await uploadImage(file, 'package');
        d.setDraft((cur) => ({ ...cur, photos: [...cur.photos, imageFromAsset(asset, cur.name)] }));
      } catch (err) {
        setPhotoErr(errorMessage(err));
      } finally {
        setPending((n) => n - 1);
      }
    }
  }

  if (query.isPending) return <PageLoading />;
  if (query.isError) return <PageError error={query.error} onRetry={() => query.refetch()} />;
  if (!isNew && !pkg) return <EmptyState icon="sell" title="Pacote não encontrado" text="Ele pode ter sido excluído." action={<Button onClick={() => navigate('/admin/pacotes')}>Voltar para os pacotes</Button>} />;
  const f = d.draft;
  if (!f) return <PageLoading />;

  const set = (p: Partial<PackageForm>) => d.patch(p);
  const lotPhases = withLotPhases(lots ?? EMPTY_LOTS, todayIn());
  const tabIndex = TABS.findIndex((t) => t.key === tab);
  const done: Record<TabKey, boolean> = {
    info: !!f.name.trim() && !!f.price.trim(),
    fotos: !!f.cover,
    incluido: f.includedItems.some((i) => i.trim()),
    publicacao: currentStatus === 'published',
  };
  const price = parsePrice(f.price);
  const promo = f.promoPrice == null ? null : parsePrice(f.promoPrice);
  const promoInvalid = promo != null && price != null && promo >= price;
  const missingTypes = HIGHLIGHT_TYPES.filter((t) => t.type === 'extra' || !f.highlights.some((h) => h.type === t.type));
  const summary = f.highlights.map((h) => h.value.trim()).filter(Boolean).join(' · ');
  const secondary = isNew || currentStatus === 'draft' ? { label: 'Salvar rascunho', status: 'draft' as const } : { label: 'Tirar do ar', status: 'draft' as const };
  const primary = currentStatus === 'published' ? { label: 'Salvar alterações', status: 'published' as const } : { label: 'Publicar', status: 'published' as const };

  return (
    <>
      <BackLink onClick={() => navigate('/admin/pacotes')}>Pacotes e valores</BackLink>
      <PageHeader
        group={isNew ? 'Novo pacote' : `${pkg?.category ? `${pkg.category} · ` : ''}Editando pacote`}
        title={
          <>
            {f.name.trim() || 'Novo pacote'} <StatusPill status={currentStatus} />
          </>
        }
        action={
          <Button
            icon="visibility"
            onClick={() => {
              if (isNew || d.dirty) toast('Salve o pacote para vê-lo na prévia.', 'info');
              else window.open(`/pacotes/${pkg!.slug}?preview=1`, '_blank', 'noopener');
            }}
          >
            Ver na prévia
          </Button>
        }
      />

      <div role="tablist" aria-label="Etapas do pacote" className={styles.steps}>
        {TABS.map((t, i) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={styles.step} onClick={() => setTab(t.key)}>
            <span className={styles.mark} data-done={(done[t.key] && tab !== t.key) || undefined}>
              {done[t.key] && tab !== t.key ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className={styles.stepLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
          <Card title="Informações principais">
            <TextField
              label="Nome do pacote"
              serif
              value={f.name}
              maxLength={120}
              placeholder="Ex.: Natal em Família"
              onChange={(name) => {
                setNameErr(false);
                set({ name });
              }}
              error={nameErr ? 'Dê um nome ao pacote.' : errors?.field('name')}
            />
            <TextField label="Subtítulo (opcional)" value={f.subtitle} maxLength={200} placeholder="Uma frase curta sobre o pacote" onChange={(subtitle) => set({ subtitle })} hint="Aparece logo abaixo do nome, no cartão." />
            <TextAreaField label="Descrição" rows={4} value={f.description} maxLength={2000} onChange={(description) => set({ description })} hint="Aparece quando o visitante abre os detalhes do pacote." />
            <TextField label="Categoria ou temporada" list="pk-cats" value={f.category} maxLength={80} placeholder="Ex.: Natal 2026" onChange={(category) => set({ category })} hint="Ajuda a organizar os pacotes por temporada. Não aparece no site." />
            <Datalist id="pk-cats" options={categories} />
          </Card>
          <Card title="Preço">
            <div className={uiStyles.grid2}>
              <MoneyField label="Preço" value={f.price} placeholder="0" onChange={(v) => set({ price: v })} error={errors?.field('price')} hint="Obrigatório para publicar." />
              {f.promoPrice != null ? (
                <div className={uiStyles.field}>
                  <MoneyField label="Preço promocional" value={f.promoPrice} placeholder="0" onChange={(v) => set({ promoPrice: v })} error={promoInvalid ? 'O preço promocional deve ser menor que o preço normal.' : errors?.field('promoPrice')} />
                  <span className={styles.promoHelp}>
                    O preço normal aparece riscado ao lado.
                    <Button variant="ghost" onClick={() => set({ promoPrice: null })}>
                      Remover
                    </Button>
                  </span>
                </div>
              ) : (
                <div className={uiStyles.field}>
                  <span className={uiStyles.label}>Preço promocional</span>
                  <Button variant="dashed" icon="add" onClick={() => set({ promoPrice: '' })}>
                    Adicionar preço promocional
                  </Button>
                </div>
              )}
            </div>
            <div className={forms.subhead}>
              <span className={forms.subheadTitle}>Valores por lote</span>
              <span className={forms.subheadText}>
                Enquanto um lote estiver valendo, o valor dele aparece no lugar do preço acima. Em branco, vale o preço normal.{' '}
                <Link to="/admin/lotes">{lotPhases.length ? 'Gerenciar lotes' : 'Criar lotes de preço'}</Link>
              </span>
            </div>
            {lotPhases.length > 0 && (
              <div className={uiStyles.grid2}>
                {lotPhases.map((lot) => (
                  <MoneyField
                    key={lot.id}
                    label={`${lot.name} · até ${formatDayMonth(lot.endsOn)}`}
                    value={f.lotPrices[lot.id] ?? ''}
                    placeholder={f.price || '0'}
                    hint={`${LOT_PHASE_LABEL[lot.phase]}${lot.status === 'draft' ? ' · lote em rascunho' : ''}`}
                    onChange={(v) => set({ lotPrices: { ...f.lotPrices, [lot.id]: v } })}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'fotos' && (
        <>
          {media.data?.enabled === false && <Alert icon="cloud_off">O envio de fotos ainda não foi configurado neste ambiente (Cloudinary).</Alert>}
          <Card title="Foto de capa" description="A foto principal do pacote. Aparece no topo dos detalhes.">
            <ImageField value={f.cover} onChange={(cover) => set({ cover })} purpose="package" frame="16/9" maxHeight={260} />
          </Card>
          <Card title="Onde a foto de capa aparece">
            <div className={forms.radioGroup} role="radiogroup" aria-label="Onde a foto de capa aparece">
              {[
                { on: false, icon: 'open_in_full', label: 'Só nos detalhes', desc: 'O cartão fica mais limpo, só com texto e preço.' },
                { on: true, icon: 'view_agenda', label: 'No cartão e nos detalhes', desc: 'A foto aparece no topo do cartão do pacote.' },
              ].map((o) => (
                <button key={o.label} type="button" role="radio" aria-checked={f.coverOnCard === o.on} className={forms.radio} onClick={() => set({ coverOnCard: o.on })}>
                  <Icon name={o.icon} size={20} />
                  <span className={forms.radioText}>
                    <span className={forms.radioLabel}>{o.label}</span>
                    <span className={forms.radioDesc}>{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Fotos adicionais" description="Aparecem como miniaturas para o visitante navegar nos detalhes do pacote.">
            <div className={styles.photos}>
              {f.photos.map((ph, i) => (
                <div key={`${ph.assetId ?? ph.url}-${i}`} className={styles.photo}>
                  <img src={cdnUrl(ph.url, 300)} alt="" loading="lazy" />
                  <IconButton icon="close" label="Remover foto" className={styles.photoRemove} onClick={() => set({ photos: f.photos.filter((_, j) => j !== i) })} />
                  <div className={styles.photoMove}>
                    <IconButton icon="chevron_left" label="Mover para a esquerda" disabled={i === 0} onClick={() => { const p = f.photos.slice(); [p[i - 1], p[i]] = [p[i]!, p[i - 1]!]; set({ photos: p }); }} />
                    <IconButton icon="chevron_right" label="Mover para a direita" disabled={i === f.photos.length - 1} onClick={() => { const p = f.photos.slice(); [p[i + 1], p[i]] = [p[i]!, p[i + 1]!]; set({ photos: p }); }} />
                  </div>
                </div>
              ))}
              {Array.from({ length: pending }, (_, i) => (
                <div key={`p${i}`} className={styles.photoPending}>
                  <Spinner size={22} />
                  Enviando…
                </div>
              ))}
              {f.photos.length + pending < CONTENT_LIMITS.packagePhotos && (
                <button type="button" className={styles.addPhoto} disabled={media.data?.enabled === false} onClick={() => photoInput.current?.click()}>
                  <Icon name="add_photo_alternate" size={22} />
                  Adicionar fotos
                </button>
              )}
            </div>
            {photoErr && (
              <Alert tone="error" icon="error">
                {photoErr}
              </Alert>
            )}
            <input ref={photoInput} type="file" multiple accept={IMAGE_UPLOAD_RULES.accept} hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = ''; }} />
          </Card>
        </>
      )}

      {tab === 'incluido' && (
        <>
          <Card title="Resumo rápido" description="Aparece abaixo do nome do pacote e no menu do site. Adicione só o que fizer sentido para este pacote.">
            <div className={uiStyles.list}>
              {f.highlights.map((h, i) => {
                const t = HIGHLIGHT_TYPES.find((x) => x.type === h.type)!;
                return (
                  <div key={i} className={styles.feat}>
                    <span className={styles.featLabel}>
                      <Icon name={t.icon} size={18} color="var(--gold)" />
                      {t.label}
                    </span>
                    <input
                      type="text"
                      className={uiStyles.input}
                      value={h.value}
                      maxLength={60}
                      placeholder={t.placeholder}
                      aria-label={t.label}
                      onChange={(e) => set({ highlights: f.highlights.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
                    />
                    <IconButton icon="close" label="Remover" onClick={() => set({ highlights: f.highlights.filter((_, j) => j !== i) })} />
                  </div>
                );
              })}
            </div>
            {f.highlights.length < CONTENT_LIMITS.packageHighlights && (
              <div className={styles.addFeats}>
                <span className={styles.addLabel}>Adicionar:</span>
                {missingTypes.map((t) => (
                  <Button key={t.type} variant="soft" icon="add" onClick={() => set({ highlights: [...f.highlights, { type: t.type as HighlightType, value: '' }] })}>
                    {t.label}
                  </Button>
                ))}
              </div>
            )}
            <div className={forms.previewBox}>
              <span className={forms.previewLabel}>Como aparece no site</span>
              <span className={forms.previewText}>{summary || 'Nenhum destaque preenchido.'}</span>
            </div>
          </Card>
          <Card title="Itens incluídos" description="A lista com ✓ exibida no cartão e nos detalhes do pacote.">
            <ListEditor items={f.includedItems} onChange={(includedItems) => set({ includedItems })} placeholder="Ex.: 10 fotos digitais em alta resolução" addLabel="Adicionar item" max={CONTENT_LIMITS.packageItems} />
          </Card>
          <Card title="Informações adicionais" description="Opcional. Um aviso exibido nos detalhes, como condições ou observações.">
            {f.extraInfo != null ? (
              <>
                <TextAreaField label="Texto" value={f.extraInfo} maxLength={1000} onChange={(extraInfo) => set({ extraInfo })} />
                <Button variant="ghost" className={forms.inlineLink} onClick={() => set({ extraInfo: null })}>
                  Remover informações adicionais
                </Button>
              </>
            ) : (
              <Button variant="dashed" icon="add" onClick={() => set({ extraInfo: '' })}>
                Adicionar informações adicionais
              </Button>
            )}
          </Card>
        </>
      )}

      {tab === 'publicacao' && (
        <>
          <Card title="Status">
            <div className={styles.statusBox} data-on={currentStatus === 'published' || undefined}>
              <Icon name={currentStatus === 'published' ? 'public' : 'edit_note'} size={22} />
              <span className={forms.radioText}>
                <span className={forms.radioLabel}>{currentStatus === 'published' ? 'Publicado — aparece no site' : isNew ? 'Ainda não salvo' : 'Rascunho — visível só no painel'}</span>
                <span className={forms.radioDesc}>
                  {currentStatus === 'published' ? 'Visitantes veem este pacote na seção de pacotes.' : 'Publique quando estiver pronto. Rascunhos aparecem marcados na prévia.'}
                </span>
              </span>
            </div>
            <span className={uiStyles.hint}>Use os botões no fim da página para publicar, salvar como rascunho ou tirar do ar.</span>
          </Card>
          <Card title="Destaque">
            <SwitchRow
              title="Destacar este pacote"
              help={f.featured ? 'Recebe o selo e um contorno dourado no site.' : 'Use para o pacote mais procurado.'}
              checked={f.featured}
              onChange={(featured) => set({ featured })}
            />
          </Card>
          <Card title="Ordem de exibição">
            <SelectField
              label="Posição no site"
              value={String(f.position)}
              options={positionOptions(items.length + (isNew ? 1 : 0))}
              onChange={(v) => set({ position: Number(v) })}
              hint="Você também pode arrastar os cartões na lista de pacotes."
            />
          </Card>
          {!isNew && currentStatus === 'draft' && (
            <Card title="Excluir pacote" description="Remove o pacote e as fotos usadas só nele.">
              <div>
                <Button
                  variant="dangerGhost"
                  icon="delete"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Excluir este pacote?', text: `“${pkg!.name}” será removido definitivamente.`, confirmLabel: 'Excluir pacote' }))) return;
                    try {
                      await adminApi.packages.remove(pkg!.id);
                      flushSync(() => d.commit(d.draft!));
                      queryClient.setQueryData(adminKeys.packages, items.filter((p) => p.id !== pkg!.id));
                      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
                      refreshSite();
                      toast('Pacote excluído.');
                      navigate('/admin/pacotes');
                    } catch (err) {
                      toast(errorMessage(err), 'error');
                    }
                  }}
                >
                  Excluir pacote
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      <div className={styles.stepNav}>
        {tabIndex > 0 ? (
          <Button variant="ghost" icon="arrow_back" onClick={() => setTab(TABS[tabIndex - 1]!.key)}>
            {TABS[tabIndex - 1]!.label}
          </Button>
        ) : (
          <span />
        )}
        {tabIndex < TABS.length - 1 && (
          <Button variant="ghost" onClick={() => setTab(TABS[tabIndex + 1]!.key)}>
            {TABS[tabIndex + 1]!.label}
            <Icon name="arrow_forward" size={18} />
          </Button>
        )}
      </div>

      <div className={styles.bar}>
        <Button variant="outline" onClick={() => navigate('/admin/pacotes')}>
          Cancelar
        </Button>
        <div className={styles.barRight}>
          <Button variant="outline" loading={saving === 'secondary'} disabled={saving !== null || pending > 0 || (!d.dirty && !isNew && currentStatus === 'draft')} onClick={() => void save(secondary.status, 'secondary')}>
            {secondary.label}
          </Button>
          <Button variant="primary" icon="check" loading={saving === 'primary'} disabled={saving !== null || pending > 0 || (currentStatus === 'published' && !d.dirty)} onClick={() => void save(primary.status, 'primary')}>
            {primary.label}
          </Button>
        </div>
      </div>
    </>
  );
}
