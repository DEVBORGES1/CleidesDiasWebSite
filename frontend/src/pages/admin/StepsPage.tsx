import { CONTENT_LIMITS, STEP_ICONS, type ImageValue, type ProcessStep, type PublicationStatus, type StepIcon } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { ImageField } from '../../components/admin/ImageField';
import { Button, Collapsible, EmptyState, IconButton, SelectField, StatusPill, SwitchRow, TextAreaField, TextField, positionOptions, uiStyles } from '../../components/admin/ui';
import { useAdmin } from '../../contexts/AdminContext';
import { adminKeys, useSteps } from '../../hooks/useAdminData';
import { moveTo, useDragReorder } from '../../hooks/useDragReorder';
import { adminApi } from '../../services/api';
import { ApiError, errorMessage } from '../../services/http';
import { toImageInput } from '../../services/uploads';
import { HandledError, PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor } from './common';
import forms from './forms.module.css';
import styles from './list.module.css';

interface StepForm {
  title: string;
  description: string;
  note: string;
  icon: StepIcon;
  image: ImageValue | null;
  status: PublicationStatus;
  position: number;
  showNote: boolean;
  showImage: boolean;
}

const NEW_ID = 'nova';

export function StepsPage() {
  const query = useSteps();
  const queryClient = useQueryClient();
  const { confirm, toast, refreshSite } = useAdmin();
  const section = useSectionEditor('how');
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<StepForm | null>(null);
  const [initial, setInitial] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ApiError | null>(null);
  const items = query.data ?? [];
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

  const setList = (list: ProcessStep[]) => queryClient.setQueryData(adminKeys.steps, list);
  const afterChange = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
    refreshSite();
  };

  async function guardDiscard() {
    if (!formDirty) return true;
    return confirm({ title: 'Descartar alterações?', text: 'A etapa aberta tem alterações não salvas.', confirmLabel: 'Descartar', icon: 'warning' });
  }

  async function open(item: ProcessStep | null) {
    if (!(await guardDiscard())) return;
    if (item && openId === item.id) {
      setOpenId(null);
      setForm(null);
      return;
    }
    const f: StepForm = item
      ? { title: item.title, description: item.description, note: item.note, icon: item.icon, image: item.image, status: item.status, position: items.indexOf(item), showNote: !!item.note, showImage: !!item.image }
      : { title: '', description: '', note: '', icon: 'chat', image: null, status: 'published', position: items.length, showNote: false, showImage: false };
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

  useEffect(() => {
    if (params.get('nova') === '1' && query.data) {
      void open(null);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, query.data]);

  async function save(): Promise<boolean> {
    if (!form) return true;
    setSaving(true);
    setErrors(null);
    try {
      const body = {
        title: form.title,
        description: form.description,
        note: form.showNote ? form.note : '',
        icon: form.icon,
        image: form.showImage ? toImageInput(form.image) : null,
        status: form.status,
      };
      const saved = openId === NEW_ID ? await adminApi.steps.create(body) : await adminApi.steps.update(openId!, body);
      let list = await adminApi.steps.list();
      if (list.findIndex((s) => s.id === saved.id) !== form.position) list = await adminApi.steps.reorder(moveTo(list.map((s) => s.id), saved.id, form.position));
      setList(list);
      afterChange();
      setOpenId(null);
      setForm(null);
      toast(form.status === 'published' ? 'Etapa salva e publicada no site.' : 'Etapa salva como rascunho.');
      return true;
    } catch (err) {
      if (err instanceof ApiError) setErrors(err);
      toast(errorMessage(err), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ProcessStep) {
    if (!(await confirm({ title: 'Excluir esta etapa?', text: `“${item.title}” será removida do site e do painel. Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir etapa' }))) return;
    try {
      await adminApi.steps.remove(item.id);
      setList(items.filter((s) => s.id !== item.id));
      if (openId === item.id) {
        setOpenId(null);
        setForm(null);
      }
      afterChange();
      toast('Etapa excluída.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function duplicate(item: ProcessStep) {
    try {
      await adminApi.steps.duplicate(item.id);
      setList(await adminApi.steps.list());
      afterChange();
      toast('Etapa duplicada como rascunho.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function reorder(ids: string[]) {
    const prev = items;
    setList(ids.map((id) => items.find((s) => s.id === id)!));
    try {
      setList(await adminApi.steps.reorder(ids));
      refreshSite();
      toast('Ordem atualizada.');
    } catch (err) {
      setList(prev);
      toast(errorMessage(err), 'error');
    }
  }

  const drag = useDragReorder(items, reorder, !openId);
  const h = section.value;

  const editor = form && (
    <div className={styles.editor}>
      <TextField label="Título da etapa" value={form.title} maxLength={120} placeholder="Ex.: Chame no WhatsApp" onChange={(title) => setForm({ ...form, title })} error={errors?.field('title')} />
      <TextAreaField label="Descrição" value={form.description} maxLength={600} onChange={(description) => setForm({ ...form, description })} hint="Seja breve: uma ou duas frases funcionam melhor." />
      <div className={uiStyles.field}>
        <span className={uiStyles.label}>Ícone</span>
        <div className={styles.iconGrid} role="group" aria-label="Ícone da etapa">
          {STEP_ICONS.map((ic) => (
            <button key={ic} type="button" className={styles.iconChoice} aria-pressed={form.icon === ic} aria-label={`Ícone ${ic}`} title={ic} onClick={() => setForm({ ...form, icon: ic })}>
              <Icon name={ic} size={22} />
            </button>
          ))}
        </div>
      </div>
      {form.showNote ? (
        <TextAreaField label="Texto complementar (opcional)" rows={2} value={form.note} maxLength={300} onChange={(note) => setForm({ ...form, note })} hint="Aparece em itálico, abaixo da descrição." />
      ) : (
        <Button variant="ghost" icon="add" className={forms.inlineLink} onClick={() => setForm({ ...form, showNote: true })}>
          Adicionar texto complementar
        </Button>
      )}
      {form.showImage ? (
        <div className={uiStyles.field}>
          <span className={uiStyles.label}>Imagem (opcional)</span>
          <ImageField value={form.image} onChange={(image) => setForm({ ...form, image, showImage: image ? true : form.showImage })} purpose="step" frame="3/2" maxHeight={180} />
          <Button variant="ghost" className={forms.inlineLink} onClick={() => setForm({ ...form, showImage: false, image: null })}>
            Remover imagem da etapa
          </Button>
        </div>
      ) : (
        <Button variant="ghost" icon="add_photo_alternate" className={forms.inlineLink} onClick={() => setForm({ ...form, showImage: true })}>
          Adicionar imagem (opcional)
        </Button>
      )}
      <SelectField label="Posição no site" value={String(form.position)} options={positionOptions(items.length + (openId === NEW_ID ? 1 : 0))} onChange={(v) => setForm({ ...form, position: Number(v) })} />
      <SwitchRow
        title="Mostrar no site"
        help={form.status === 'published' ? 'A etapa aparece na seção “Como funciona”.' : 'Fica salva como rascunho, só no painel.'}
        checked={form.status === 'published'}
        onChange={(on) => setForm({ ...form, status: on ? 'published' : 'draft' })}
      />
      <div className={styles.editorFooter}>
        {openId !== NEW_ID ? (
          <Button variant="dangerGhost" icon="delete" onClick={() => void remove(items.find((s) => s.id === openId)!)}>
            Excluir etapa
          </Button>
        ) : (
          <span />
        )}
        <div className={styles.editorButtons}>
          <Button variant="outline" onClick={() => void close()}>
            Cancelar
          </Button>
          <Button variant="primary" icon="check" loading={saving} onClick={() => void save()}>
            Salvar etapa
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        group="Conteúdo do site"
        title="Como funciona"
        description="As etapas do seu atendimento. Cada cartão abaixo é uma etapa que o visitante vê no site, na mesma ordem."
        action={
          <Button variant="primary" icon="add" disabled={items.length >= CONTENT_LIMITS.steps} onClick={() => void open(null)}>
            Adicionar etapa
          </Button>
        }
      />
      {query.isPending && <PageLoading />}
      {query.isError && <PageError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && (
        <>
          {items.length > 0 && (
            <ol className={styles.list} aria-label="Etapas">
              {items.map((st, i) => {
                const isOpen = openId === st.id;
                return (
                  <li key={st.id} className={styles.item} data-open={isOpen || undefined} data-dragging={drag.isDragging(st.id) || undefined} data-over={drag.isOver(st.id) || undefined} {...drag.itemProps(st)}>
                    <div className={styles.row}>
                      <span className={styles.handle} aria-hidden="true">
                        <Icon name="drag_indicator" size={20} />
                        <span className={styles.num}>{i + 1}</span>
                      </span>
                      <span className={styles.circleIcon} aria-hidden="true">
                        <Icon name={st.icon} size={22} />
                      </span>
                      <button type="button" className={styles.main} aria-expanded={isOpen} onClick={() => void open(st)}>
                        <span className={styles.mainTitle}>{st.title}</span>
                        <span className={styles.mainText}>{st.description}</span>
                      </button>
                      <span className={styles.rowActions}>
                        <StatusPill status={st.status} feminine />
                        <IconButton icon={isOpen ? 'close' : 'edit'} label={isOpen ? 'Fechar edição' : 'Editar'} onClick={() => void open(st)} />
                        <IconButton icon="content_copy" label="Duplicar" disabled={items.length >= CONTENT_LIMITS.steps} onClick={() => void duplicate(st)} />
                        <IconButton icon="delete" label="Excluir" onClick={() => void remove(st)} />
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
                <span className={styles.num} style={{ marginLeft: 6 }}>
                  {items.length + 1}
                </span>
                <span className={styles.mainTitle}>Nova etapa</span>
              </div>
              {editor}
            </div>
          )}
          {items.length > 0 && openId !== NEW_ID && (
            <Button variant="dashed" icon="add" disabled={items.length >= CONTENT_LIMITS.steps} onClick={() => void open(null)}>
              Adicionar etapa
            </Button>
          )}
          {items.length === 0 && openId !== NEW_ID && (
            <EmptyState
              icon="route"
              title="Nenhuma etapa cadastrada"
              text="Crie a primeira etapa do seu atendimento — por exemplo, “Chame no WhatsApp”."
              action={
                <Button variant="primary" icon="add" onClick={() => void open(null)}>
                  Adicionar etapa
                </Button>
              }
            />
          )}
        </>
      )}
      {h && (
        <Collapsible title="Textos da seção" description="Título, subtítulo, aviso e a conversa de exemplo exibida ao lado das etapas.">
          <div className={uiStyles.grid2}>
            <TextField label="Título" value={h.title} maxLength={80} onChange={(title) => section.patch({ title })} />
            <TextField label="Subtítulo" value={h.subtitle} maxLength={160} onChange={(subtitle) => section.patch({ subtitle })} />
          </div>
          <div className={uiStyles.grid2}>
            <TextField label="Rótulo das etapas" value={h.stepPrefix} maxLength={20} onChange={(stepPrefix) => section.patch({ stepPrefix })} hint="Ex.: “Passo” vira Passo 1, Passo 2…" />
            <TextField label="Aviso abaixo das etapas" value={h.note} maxLength={200} onChange={(note) => section.patch({ note })} />
          </div>
          <div className={forms.subhead}>
            <span className={forms.subheadTitle}>Conversa de exemplo</span>
            <span className={forms.subheadText}>A simulação de WhatsApp ao lado das etapas. Sem mensagens, o celular não aparece.</span>
          </div>
          <div className={uiStyles.grid2}>
            <TextField label="Nome no topo" value={h.chatName} maxLength={60} onChange={(chatName) => section.patch({ chatName })} />
            <TextField label="Status" value={h.chatStatus} maxLength={30} onChange={(chatStatus) => section.patch({ chatStatus })} />
          </div>
          <div className={uiStyles.list}>
            {h.chatMessages.map((m, i) => (
              <div key={i} className={forms.chatRow}>
                <button
                  type="button"
                  className={forms.whoToggle}
                  data-me={m.fromClient}
                  title="Alternar quem envia a mensagem"
                  onClick={() => section.patch({ chatMessages: h.chatMessages.map((x, j) => (j === i ? { ...x, fromClient: !x.fromClient } : x)) })}
                >
                  {m.fromClient ? 'Cliente' : 'Você'}
                </button>
                <input
                  type="text"
                  className={uiStyles.input}
                  value={m.text}
                  maxLength={200}
                  aria-label={`Mensagem ${i + 1}`}
                  onChange={(e) => section.patch({ chatMessages: h.chatMessages.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                />
                <IconButton
                  icon="arrow_upward"
                  label="Mover para cima"
                  disabled={i === 0}
                  onClick={() => {
                    const next = h.chatMessages.slice();
                    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                    section.patch({ chatMessages: next });
                  }}
                />
                <IconButton
                  icon="arrow_downward"
                  label="Mover para baixo"
                  disabled={i === h.chatMessages.length - 1}
                  onClick={() => {
                    const next = h.chatMessages.slice();
                    [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
                    section.patch({ chatMessages: next });
                  }}
                />
                <IconButton icon="close" label="Remover mensagem" onClick={() => section.patch({ chatMessages: h.chatMessages.filter((_, j) => j !== i) })} />
              </div>
            ))}
            {h.chatMessages.length < 10 && (
              <Button
                variant="dashed"
                icon="add"
                onClick={() => section.patch({ chatMessages: [...h.chatMessages, { fromClient: !(h.chatMessages.at(-1)?.fromClient ?? false), text: '' }] })}
              >
                Adicionar mensagem
              </Button>
            )}
          </div>
          <TextField label="Botão abaixo da conversa" value={h.chatButton} maxLength={60} onChange={(chatButton) => section.patch({ chatButton })} />
        </Collapsible>
      )}
    </>
  );
}
