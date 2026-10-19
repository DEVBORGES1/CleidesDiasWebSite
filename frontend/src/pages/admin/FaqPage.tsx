import { CONTENT_LIMITS, plainPreview, normalizeSearch } from '@cleides/shared/utils';
import type { FaqItem, PublicationStatus } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button, Collapsible, Datalist, EmptyState, IconButton, SelectField, StatusPill, SwitchRow, TextAreaField, TextField, positionOptions, uiStyles } from '../../components/admin/ui';
import { useAdmin } from '../../contexts/AdminContext';
import { adminKeys, useFaq } from '../../hooks/useAdminData';
import { moveTo, useDragReorder } from '../../hooks/useDragReorder';
import { adminApi } from '../../services/api';
import { ApiError, errorMessage } from '../../services/http';
import { HandledError, PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor } from './common';
import styles from './list.module.css';

const EMPTY: FaqItem[] = [];

interface FaqForm {
  question: string;
  answer: string;
  category: string;
  status: PublicationStatus;
  position: number;
}

const NEW_ID = 'nova';

export function FaqPage() {
  const query = useFaq();
  const queryClient = useQueryClient();
  const { confirm, toast, refreshSite } = useAdmin();
  const section = useSectionEditor('faq');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FaqForm | null>(null);
  const [initial, setInitial] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ApiError | null>(null);

  const items = query.data ?? EMPTY;
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
  const filtered = useMemo(() => {
    const q = normalizeSearch(search.trim());
    return q ? items.filter((f) => normalizeSearch(`${f.question} ${f.answer} ${f.category}`).includes(q)) : items;
  }, [items, search]);
  const categories = useMemo(() => [...new Set(items.map((f) => f.category).filter(Boolean))], [items]);
  const published = items.filter((f) => f.status === 'published').length;

  const setList = (list: FaqItem[]) => queryClient.setQueryData(adminKeys.faq, list);

  async function guardDiscard(): Promise<boolean> {
    if (!formDirty) return true;
    return confirm({ title: 'Descartar alterações?', text: 'A pergunta aberta tem alterações não salvas.', confirmLabel: 'Descartar', icon: 'warning' });
  }

  async function open(item: FaqItem | null) {
    if (!(await guardDiscard())) return;
    if (item && openId === item.id) {
      setOpenId(null);
      setForm(null);
      return;
    }
    const f: FaqForm = item
      ? { question: item.question, answer: item.answer, category: item.category, status: item.status, position: items.indexOf(item) }
      : { question: '', answer: '', category: '', status: 'published', position: items.length };
    setErrors(null);
    setForm(f);
    setInitial(JSON.stringify(f));
    setOpenId(item ? item.id : NEW_ID);
  }

  useEffect(() => {
    if (params.get('nova') === '1' && query.data) {
      void open(null);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, query.data]);

  async function reorder(ids: string[]) {
    const prev = items;
    setList(ids.map((id) => items.find((f) => f.id === id)!));
    try {
      setList(await adminApi.faq.reorder(ids));
      refreshSite();
      toast('Ordem atualizada.');
    } catch (err) {
      setList(prev);
      toast(errorMessage(err), 'error');
    }
  }

  async function close() {
    if (!(await guardDiscard())) return;
    setOpenId(null);
    setForm(null);
  }

  async function save(): Promise<boolean> {
    if (!form) return true;
    setSaving(true);
    setErrors(null);
    try {
      const body = { question: form.question, answer: form.answer, category: form.category, status: form.status };
      const saved = openId === NEW_ID ? await adminApi.faq.create(body) : await adminApi.faq.update(openId!, body);
      let list = (await adminApi.faq.list()) as FaqItem[];
      const currentIndex = list.findIndex((f) => f.id === saved.id);
      if (form.position !== currentIndex) list = await adminApi.faq.reorder(moveTo(list.map((f) => f.id), saved.id, form.position));
      setList(list);
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      refreshSite();
      setOpenId(null);
      setForm(null);
      toast(form.status === 'published' ? 'Pergunta salva e publicada no site.' : 'Pergunta salva como rascunho.');
      return true;
    } catch (err) {
      if (err instanceof ApiError) setErrors(err);
      toast(errorMessage(err), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: FaqItem) {
    if (!(await confirm({ title: 'Excluir esta pergunta?', text: `“${item.question}” será removida do site e do painel. Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir pergunta' }))) return;
    try {
      await adminApi.faq.remove(item.id);
      setList(items.filter((f) => f.id !== item.id));
      if (openId === item.id) {
        setOpenId(null);
        setForm(null);
      }
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      refreshSite();
      toast('Pergunta excluída.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  const drag = useDragReorder(filtered, reorder, !search && !openId);
  const addToolbar = (insert: string) => form && setForm({ ...form, answer: form.answer.replace(/\s*$/, '') + insert });

  const editor = form && (
    <div className={styles.editor}>
      <TextField label="Pergunta" value={form.question} maxLength={300} placeholder="Ex.: Posso levar acessórios para o ensaio?" onChange={(question) => setForm({ ...form, question })} error={errors?.field('question')} />
      <TextAreaField
        label="Resposta"
        rows={6}
        value={form.answer}
        maxLength={5000}
        placeholder="Escreva a resposta como você explicaria para uma cliente."
        onChange={(answer) => setForm({ ...form, answer })}
        error={errors?.field('answer')}
        hint="Deixe uma linha em branco para começar outro parágrafo. Linhas que começam com “- ” viram uma lista."
        toolbar={
          <div className={styles.toolbarButtons} role="toolbar" aria-label="Formatação">
            <Button variant="soft" icon="format_paragraph" onClick={() => addToolbar('\n\n')}>
              Parágrafo
            </Button>
            <Button variant="soft" icon="format_list_bulleted" onClick={() => addToolbar('\n- ')}>
              Lista
            </Button>
          </div>
        }
      />
      <div className={uiStyles.grid2}>
        <TextField label="Categoria (opcional)" list="faq-cats" value={form.category} maxLength={60} placeholder="Ex.: Pagamento" onChange={(category) => setForm({ ...form, category })} hint="Só para organizar aqui no painel." />
        <SelectField
          label="Posição no site"
          value={String(form.position)}
          options={positionOptions(items.length + (openId === NEW_ID ? 1 : 0))}
          onChange={(v) => setForm({ ...form, position: Number(v) })}
        />
      </div>
      <Datalist id="faq-cats" options={categories} />
      <SwitchRow
        title="Mostrar no site"
        help={form.status === 'published' ? 'A pergunta aparece na seção de dúvidas.' : 'Fica salva como rascunho, só no painel.'}
        checked={form.status === 'published'}
        onChange={(on) => setForm({ ...form, status: on ? 'published' : 'draft' })}
      />
      <div className={styles.editorFooter}>
        {openId !== NEW_ID ? (
          <Button variant="dangerGhost" icon="delete" onClick={() => void remove(items.find((f) => f.id === openId)!)}>
            Excluir pergunta
          </Button>
        ) : (
          <span />
        )}
        <div className={styles.editorButtons}>
          <Button variant="outline" onClick={() => void close()}>
            Cancelar
          </Button>
          <Button variant="primary" icon="check" loading={saving} onClick={() => void save()}>
            Salvar pergunta
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        group="Conteúdo do site"
        title="Dúvidas frequentes"
        description="Perguntas e respostas exibidas no site em uma lista expansível. Clique em uma pergunta para editá-la."
        action={
          <Button variant="primary" icon="add" disabled={items.length >= CONTENT_LIMITS.faqItems} onClick={() => void open(null)}>
            Adicionar pergunta
          </Button>
        }
      />
      {query.isPending && <PageLoading />}
      {query.isError && <PageError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && (
        <>
          <div className={styles.toolbar}>
            <span className={styles.stats}>
              <Icon name="help" size={18} color="var(--primary)" />
              {items.length} {items.length === 1 ? 'pergunta' : 'perguntas'} · {published} {published === 1 ? 'publicada' : 'publicadas'}
            </span>
            <label className={styles.search}>
              <Icon name="search" size={18} />
              <input type="search" value={search} placeholder="Buscar pergunta…" aria-label="Buscar pergunta" onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
          {!search && items.length > 1 && !openId && (
            <span className={styles.dragHint}>
              <Icon name="drag_pan" size={16} />
              Arraste as perguntas para mudar a ordem
            </span>
          )}
          {filtered.length > 0 && (
            <ol className={styles.list} aria-label="Perguntas">
              {filtered.map((f) => {
                const isOpen = openId === f.id;
                return (
                  <li key={f.id} className={styles.item} data-open={isOpen || undefined} data-dragging={drag.isDragging(f.id) || undefined} data-over={drag.isOver(f.id) || undefined} {...drag.itemProps(f)}>
                    <div className={styles.row}>
                      <span className={styles.handle} aria-hidden="true">
                        <Icon name="drag_indicator" size={20} />
                        <span className={styles.num}>{items.indexOf(f) + 1}</span>
                      </span>
                      <button type="button" className={styles.main} aria-expanded={isOpen} onClick={() => void open(f)}>
                        <span className={styles.mainTitle}>{f.question}</span>
                        <span className={styles.mainText}>{plainPreview(f.answer, 110)}</span>
                        {f.category && <span className={styles.cat}>{f.category}</span>}
                      </button>
                      <span className={styles.rowActions}>
                        <StatusPill status={f.status} feminine />
                        <IconButton icon="expand_more" label={isOpen ? 'Fechar edição' : 'Editar pergunta'} onClick={() => void open(f)} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
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
                <span className={styles.mainTitle}>Nova pergunta</span>
              </div>
              {editor}
            </div>
          )}
          {!search && openId !== NEW_ID && items.length > 0 && (
            <Button variant="dashed" icon="add" onClick={() => void open(null)}>
              Adicionar pergunta
            </Button>
          )}
          {items.length === 0 && openId !== NEW_ID && (
            <EmptyState
              icon="help"
              title="Nenhuma pergunta ainda"
              text="Adicione as dúvidas que as clientes mais perguntam no WhatsApp. Elas aparecem no site em uma lista expansível."
              action={
                <Button variant="primary" icon="add" onClick={() => void open(null)}>
                  Adicionar pergunta
                </Button>
              }
            />
          )}
          {search && filtered.length === 0 && <EmptyState icon="search_off" title="Nenhuma pergunta encontrada" text="Tente outra palavra ou limpe a busca." />}
        </>
      )}
      {section.value && (
        <Collapsible title="Textos da seção" description="Título e subtítulo exibidos acima das perguntas.">
          <div className={uiStyles.grid2}>
            <TextField label="Título" value={section.value.title} maxLength={80} onChange={(title) => section.patch({ title })} />
            <TextField label="Subtítulo" value={section.value.subtitle} maxLength={160} onChange={(subtitle) => section.patch({ subtitle })} />
          </div>
        </Collapsible>
      )}
    </>
  );
}
