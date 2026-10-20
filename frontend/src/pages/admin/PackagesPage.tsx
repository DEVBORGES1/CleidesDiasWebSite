import { CONTENT_LIMITS, HIGHLIGHT_TYPES, formatDayMonth, formatPrice, lotPriceFor, todayIn, withLotPhases } from '@cleides/shared/utils';
import type { Package } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button, Collapsible, EmptyState, IconButton, StatusPill, TextField, uiStyles } from '../../components/admin/ui';
import { useAdmin } from '../../contexts/AdminContext';
import { adminKeys, useLots, usePackages } from '../../hooks/useAdminData';
import { useDragReorder } from '../../hooks/useDragReorder';
import { cdnUrl } from '../../lib/cdn';
import { adminApi } from '../../services/api';
import { errorMessage } from '../../services/http';
import { PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor } from './common';
import styles from './PackagesPage.module.css';

const EMPTY: Package[] = [];

type Filter = 'todos' | 'published' | 'draft';

export function PackagesPage() {
  const query = usePackages();
  const currentLot = withLotPhases(useLots().data ?? [], todayIn()).find((l) => l.phase === 'current');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm, toast, refreshSite } = useAdmin();
  const section = useSectionEditor('packages');
  usePageEditors(section);
  const [filter, setFilter] = useState<Filter>('todos');
  const items = query.data ?? EMPTY;
  const shown = filter === 'todos' ? items : items.filter((p) => p.status === filter);
  const counts = { todos: items.length, published: items.filter((p) => p.status === 'published').length, draft: items.filter((p) => p.status === 'draft').length };

  const setList = (list: Package[]) => queryClient.setQueryData(adminKeys.packages, list);
  const after = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
    refreshSite();
  };

  async function reorder(ids: string[]) {
    const prev = items;
    setList(ids.map((id) => items.find((p) => p.id === id)!));
    try {
      setList(await adminApi.packages.reorder(ids));
      refreshSite();
      toast('Ordem atualizada.');
    } catch (err) {
      setList(prev);
      toast(errorMessage(err), 'error');
    }
  }

  async function duplicate(p: Package) {
    try {
      const copy = await adminApi.packages.duplicate(p.id);
      setList(await adminApi.packages.list());
      after();
      toast(`“${copy.name}” criado como rascunho.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function remove(p: Package) {
    if (!(await confirm({ title: 'Excluir este pacote?', text: `“${p.name}” será removido do site e do painel, junto com as fotos usadas só nele. Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir pacote' }))) return;
    try {
      await adminApi.packages.remove(p.id);
      setList(items.filter((x) => x.id !== p.id));
      after();
      toast('Pacote excluído.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  const drag = useDragReorder(shown, reorder, filter === 'todos');
  const s = section.value;

  return (
    <>
      <PageHeader
        group="Vendas e serviços"
        title="Pacotes e valores"
        description="Crie, edite e organize seus pacotes. Só os pacotes publicados aparecem no site, na ordem abaixo."
        action={
          <Button variant="primary" icon="add" disabled={items.length >= CONTENT_LIMITS.packages} onClick={() => navigate('/admin/pacotes/novo')}>
            Criar novo pacote
          </Button>
        }
      />
      {query.isPending && <PageLoading />}
      {query.isError && <PageError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && (
        <>
          <div role="tablist" aria-label="Filtrar pacotes" className={styles.tabs}>
            {(
              [
                ['todos', 'Todos'],
                ['published', 'Publicados'],
                ['draft', 'Rascunhos'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} className={styles.tab} onClick={() => setFilter(k)}>
                {label}
                <span>{counts[k]}</span>
              </button>
            ))}
          </div>
          {shown.length > 0 ? (
            <div className={styles.grid}>
              {shown.map((p) => (
                <article
                  key={p.id}
                  className={styles.card}
                  data-featured={p.featured || undefined}
                  data-draft={p.status === 'draft' || undefined}
                  data-dragging={drag.isDragging(p.id) || undefined}
                  data-over={drag.isOver(p.id) || undefined}
                  {...drag.itemProps(p)}
                >
                  <div className={styles.media}>
                    {p.cover?.url ? (
                      <img
                        src={cdnUrl(p.cover.url, 640)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        style={{ objectPosition: `${p.cover.x}% ${p.cover.y}%`, transform: `scale(${p.cover.zoom})`, transformOrigin: `${p.cover.x}% ${p.cover.y}%` }}
                      />
                    ) : (
                      <button type="button" className={styles.addCover} onClick={() => navigate(`/admin/pacotes/${p.id}?etapa=fotos`)}>
                        <Icon name="add_photo_alternate" size={22} />
                        Adicionar foto de capa
                      </button>
                    )}
                    <span className={styles.badges}>
                      <StatusPill status={p.status} />
                      {p.featured && (
                        <span className={styles.featured}>
                          <Icon name="star" size={14} />
                          Destaque
                        </span>
                      )}
                    </span>
                    <span className={styles.pos} title="Posição no site — arraste o cartão para reordenar">
                      <Icon name="drag_indicator" size={14} />
                      {items.indexOf(p) + 1}º
                    </span>
                  </div>
                  <div className={styles.body}>
                    {p.category && <span className={styles.cat}>{p.category}</span>}
                    <div className={styles.nameRow}>
                      <h3 className={styles.name}>{p.name}</h3>
                      <span className={styles.price}>
                        {p.promoPrice != null && <span className={styles.old}>R$ {formatPrice(p.price)}</span>}
                        {p.price != null ? `R$ ${formatPrice(p.promoPrice ?? p.price)}` : <span className={styles.noPrice}>Sem preço</span>}
                      </span>
                    </div>
                    {lotPriceFor(currentLot, p.id) != null && (
                      <span className={styles.lotPrice}>
                        No site: R$ {formatPrice(lotPriceFor(currentLot, p.id))} · {currentLot!.name} até {formatDayMonth(currentLot!.endsOn)}
                        {currentLot!.status === 'draft' && ' (rascunho)'}
                      </span>
                    )}
                    {(p.subtitle || p.description) && <p className={styles.desc}>{p.subtitle || p.description}</p>}
                    {p.highlights.length > 0 && (
                      <div className={styles.feats}>
                        {p.highlights.map((h, i) => (
                          <span key={i} className={styles.feat}>
                            <Icon name={HIGHLIGHT_TYPES.find((t) => t.type === h.type)?.icon ?? 'check'} size={15} />
                            {h.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <Button variant="soft" icon="edit" onClick={() => navigate(`/admin/pacotes/${p.id}`)}>
                      Editar
                    </Button>
                    <span className={styles.spacer} />
                    <IconButton icon="content_copy" label="Duplicar" disabled={items.length >= CONTENT_LIMITS.packages} onClick={() => void duplicate(p)} />
                    <IconButton icon="visibility" label="Ver no site (prévia)" onClick={() => window.open(`/pacotes/${p.slug}?preview=1`, '_blank', 'noopener')} />
                    <IconButton icon="delete" label="Excluir" onClick={() => void remove(p)} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="sell"
              title={filter === 'todos' ? 'Nenhum pacote cadastrado' : filter === 'draft' ? 'Nenhum rascunho' : 'Nenhum pacote publicado'}
              text={filter === 'todos' ? 'Crie o primeiro pacote com nome, preço e o que está incluído. Ele pode ficar como rascunho até você publicar.' : 'Mude o filtro para ver os demais pacotes.'}
              action={
                filter === 'todos' && (
                  <Button variant="primary" icon="add" onClick={() => navigate('/admin/pacotes/novo')}>
                    Criar novo pacote
                  </Button>
                )
              }
            />
          )}
        </>
      )}
      {s && (
        <Collapsible title="Textos da seção" description="Título, subtítulo, selo de destaque e a chamada abaixo dos pacotes.">
          <div className={uiStyles.grid2}>
            <TextField label="Título" value={s.title} maxLength={80} onChange={(title) => section.patch({ title })} />
            <TextField label="Subtítulo" value={s.subtitle} maxLength={160} onChange={(subtitle) => section.patch({ subtitle })} />
          </div>
          <div className={uiStyles.grid2}>
            <TextField label="Selo do pacote em destaque" value={s.featuredBadge} maxLength={30} onChange={(featuredBadge) => section.patch({ featuredBadge })} />
            <TextField label="Dica no celular" value={s.mobileHint} maxLength={120} onChange={(mobileHint) => section.patch({ mobileHint })} />
          </div>
          <div className={uiStyles.grid2}>
            <TextField label="Pergunta abaixo dos pacotes" value={s.questionLead} maxLength={80} onChange={(questionLead) => section.patch({ questionLead })} />
            <TextField label="Botão abaixo dos pacotes" value={s.questionButton} maxLength={60} onChange={(questionButton) => section.patch({ questionButton })} />
          </div>
        </Collapsible>
      )}
    </>
  );
}
