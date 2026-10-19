import { CONTENT_LIMITS, IMAGE_UPLOAD_RULES, type GalleryImage, type ImageValue, type PublicationStatus } from '@cleides/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { ImageField } from '../../components/admin/ImageField';
import {
  Alert,
  Button,
  Card,
  Collapsible,
  Datalist,
  EmptyState,
  IconButton,
  ListEditor,
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
import { adminKeys, useGallery, useMediaStatus, useSections } from '../../hooks/useAdminData';
import { useDraft } from '../../hooks/useDraft';
import { moveTo, useDragReorder } from '../../hooks/useDragReorder';
import { cdnUrl } from '../../lib/cdn';
import { adminApi } from '../../services/api';
import { ApiError, errorMessage } from '../../services/http';
import { checkImageFile, uploadImage } from '../../services/uploads';
import { BackLink, PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor } from './common';
import styles from './GalleryPage.module.css';

interface UploadItem {
  key: string;
  name: string;
  progress: number;
  state: 'loading' | 'done' | 'error';
  message: string;
}

const titleFromFile = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/^(img|dsc|image|foto)[-_ ]?\d+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .slice(0, 120);

export function GalleryPage() {
  const query = useGallery();
  const sections = useSections();
  const media = useMediaStatus();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast, refreshSite, confirm } = useAdmin();
  const section = useSectionEditor('gallery');
  usePageEditors(section);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [over, setOver] = useState(false);
  const [album, setAlbum] = useState<string | null>(null);

  const items = query.data ?? [];
  const coverAssetId = sections.data?.hero.image?.assetId;
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((g) => g.category && map.set(g.category, (map.get(g.category) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [items]);
  const shown = album ? items.filter((g) => g.category === album) : items;
  const drafts = items.filter((g) => g.status === 'draft');
  const enabled = media.data?.enabled !== false;

  const setList = (list: GalleryImage[]) => queryClient.setQueryData(adminKeys.gallery, list);
  const patchUpload = (key: string, p: Partial<UploadItem>) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    if (!enabled) {
      toast('O envio de fotos ainda não foi configurado (Cloudinary).', 'error');
      return;
    }
    const room = CONTENT_LIMITS.galleryImages - items.length;
    const accepted = list.slice(0, Math.max(0, room));
    if (accepted.length < list.length) toast(`Limite de ${CONTENT_LIMITS.galleryImages} fotos: algumas não foram enviadas.`, 'error');
    const batch = accepted.map((file) => ({ file, key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}` }));
    setUploads((u) => [...u.filter((x) => x.state === 'loading'), ...batch.map((b) => ({ key: b.key, name: b.file.name, progress: 0, state: 'loading' as const, message: 'Preparando…' }))]);

    let ok = 0;
    // Até 3 envios simultâneos.
    const queue = batch.slice();
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { file, key } = next;
        const problem = checkImageFile(file);
        if (problem) {
          patchUpload(key, { state: 'error', message: problem });
          continue;
        }
        try {
          const asset = await uploadImage(file, 'gallery', (p) => patchUpload(key, { progress: p, message: `Enviando… ${p}%` }));
          patchUpload(key, { message: 'Salvando na galeria…' });
          await adminApi.gallery.create({ assetId: asset.id, title: titleFromFile(file.name), status: 'draft' });
          patchUpload(key, { state: 'done', progress: 100, message: 'Enviada como rascunho' });
          ok++;
        } catch (err) {
          patchUpload(key, { state: 'error', message: errorMessage(err) });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (ok) {
      setList(await adminApi.gallery.list());
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      toast(ok === 1 ? '1 foto enviada como rascunho. Revise e publique quando quiser.' : `${ok} fotos enviadas como rascunho. Revise e publique quando quiser.`);
      setTimeout(() => setUploads((u) => u.filter((x) => x.state !== 'done')), 4000);
    }
  }

  async function publishAll() {
    if (!(await confirm({ title: `Publicar ${drafts.length} ${drafts.length === 1 ? 'foto' : 'fotos'}?`, text: 'As fotos em rascunho passarão a aparecer na galeria do site.', confirmLabel: 'Publicar todas', icon: 'public', tone: 'neutral' }))) return;
    try {
      await adminApi.gallery.setStatus(drafts.map((d) => d.id), 'published');
      setList(await adminApi.gallery.list());
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      refreshSite();
      toast('Fotos publicadas no site.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function reorder(ids: string[]) {
    const prev = items;
    setList(ids.map((id) => items.find((g) => g.id === id)!));
    try {
      setList(await adminApi.gallery.reorder(ids));
      refreshSite();
      toast('Ordem atualizada.');
    } catch (err) {
      setList(prev);
      toast(errorMessage(err), 'error');
    }
  }

  const drag = useDragReorder(shown, reorder, !album);
  const g = section.value;

  return (
    <>
      <PageHeader
        group="Conteúdo do site"
        title="Galeria de fotos"
        description="Envie, organize e escolha como cada foto aparece no site. Fotos novas entram como rascunho para você revisar."
        action={
          <Button variant="primary" icon="add" disabled={!enabled} onClick={() => fileRef.current?.click()}>
            Enviar fotos
          </Button>
        }
      />
      {!enabled && <Alert icon="cloud_off">O envio de fotos ainda não foi configurado neste ambiente (Cloudinary). Veja o guia de implantação.</Alert>}

      <div
        className={styles.drop}
        data-over={over || undefined}
        role="button"
        tabIndex={0}
        aria-label="Enviar fotos"
        onClick={() => enabled && fileRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileRef.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <span className={styles.dropIcon}>
          <Icon name={over ? 'download' : 'add_photo_alternate'} size={24} />
        </span>
        <span className={styles.dropText}>
          <span className={styles.dropTitle}>{over ? 'Solte as fotos para enviar' : 'Arraste fotos para cá ou clique para selecionar'}</span>
          <span className={styles.dropHint}>Você pode enviar várias de uma vez · JPG, PNG ou WEBP, até {IMAGE_UPLOAD_RULES.maxMegabytes} MB cada</span>
        </span>
        <span className={styles.dropBtn}>
          <Icon name="upload" size={18} />
          Selecionar fotos
        </span>
      </div>
      <input ref={fileRef} type="file" multiple accept={IMAGE_UPLOAD_RULES.accept} hidden onChange={(e) => { void handleFiles(e.target.files ?? []); e.target.value = ''; }} />

      {uploads.length > 0 && (
        <div className={styles.uploads} aria-live="polite">
          {uploads.map((u) => (
            <div key={u.key} className={styles.upload} data-state={u.state}>
              <span className={styles.uploadIcon}>
                {u.state === 'loading' && <Spinner size={20} />}
                {u.state === 'done' && <Icon name="check_circle" size={20} color="#5E7F55" />}
                {u.state === 'error' && <Icon name="error" size={20} color="#9A4A2E" />}
              </span>
              <span className={styles.uploadText}>
                <span className={styles.uploadName}>{u.name}</span>
                <span className={styles.uploadMsg}>{u.message}</span>
                {u.state === 'loading' && (
                  <span className={styles.bar}>
                    <span style={{ width: `${u.progress}%` }} />
                  </span>
                )}
              </span>
              {u.state === 'error' && <IconButton icon="close" label="Fechar aviso" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))} />}
            </div>
          ))}
        </div>
      )}

      {query.isPending && <PageLoading />}
      {query.isError && <PageError error={query.error} onRetry={() => query.refetch()} />}

      {drafts.length > 0 && (
        <div className={styles.draftBanner}>
          <Icon name="visibility_off" size={20} />
          <span>
            {drafts.length === 1 ? '1 foto em rascunho' : `${drafts.length} fotos em rascunho`} — ainda não aparecem no site.
          </span>
          <Button variant="primary" icon="public" onClick={() => void publishAll()}>
            Publicar todas
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className={styles.chips} role="group" aria-label="Filtrar por álbum">
            <button type="button" className={styles.chip} aria-pressed={album === null} onClick={() => setAlbum(null)}>
              Todas <span>{items.length}</span>
            </button>
            {categories.map(([name, n]) => (
              <button key={name} type="button" className={styles.chip} aria-pressed={album === name} onClick={() => setAlbum(name)}>
                {name} <span>{n}</span>
              </button>
            ))}
          </div>
          <span className={styles.hint}>
            <Icon name="drag_pan" size={16} />
            {album ? 'Mostre “Todas” para mudar a ordem das fotos' : 'Arraste as fotos para mudar a ordem'}
          </span>
          <div className={styles.tiles}>
            {shown.map((t) => (
              <div key={t.id} className={styles.tile} data-dragging={drag.isDragging(t.id) || undefined} data-over={drag.isOver(t.id) || undefined} {...drag.itemProps(t)}>
                <button type="button" className={styles.tileBtn} onClick={() => navigate(`/admin/galeria/${t.id}`)} aria-label={`Editar foto ${t.title || 'sem título'}`}>
                  <span className={styles.tileMedia}>
                    {t.image.url ? (
                      <img
                        src={cdnUrl(t.image.url, 400)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        style={{ objectPosition: `${t.image.x}% ${t.image.y}%`, transform: `scale(${t.image.zoom})`, transformOrigin: `${t.image.x}% ${t.image.y}%` }}
                      />
                    ) : (
                      <span className={styles.noPhoto}>
                        <Icon name="add_photo_alternate" size={20} />
                        Sem foto
                      </span>
                    )}
                    <span className={styles.tileBadges}>
                      <StatusPill status={t.status} feminine />
                      {coverAssetId && t.image.assetId === coverAssetId && (
                        <span className={styles.coverBadge} title="Foto de capa do site">
                          <Icon name="star" size={14} />
                          Capa
                        </span>
                      )}
                    </span>
                  </span>
                  <span className={styles.tileText}>
                    <span className={styles.tileTitle}>{t.title || 'Sem título'}</span>
                    <span className={styles.tileAlbum}>{t.category || 'Sem álbum'}</span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {query.data && items.length === 0 && (
        <EmptyState icon="photo_library" title="Nenhuma foto aqui" text="Envie fotos pela área acima. Elas entram como rascunho para você revisar antes de publicar." />
      )}

      {g && (
        <Collapsible title="Textos da seção" description="Título, subtítulo, botão e a faixa decorativa abaixo da galeria.">
          <div className={uiStyles.grid2}>
            <TextField label="Título" value={g.title} maxLength={80} onChange={(title) => section.patch({ title })} />
            <TextField label="Subtítulo" value={g.subtitle} maxLength={160} onChange={(subtitle) => section.patch({ subtitle })} />
          </div>
          <TextField label="Botão “ver galeria completa”" value={g.buttonLabel} maxLength={40} onChange={(buttonLabel) => section.patch({ buttonLabel })} />
          <div className={uiStyles.field}>
            <span className={uiStyles.label}>Faixa decorativa</span>
            <span className={uiStyles.hint}>Palavras que passam em movimento abaixo da galeria.</span>
          </div>
          <ListEditor items={g.ticks} onChange={(ticks) => section.patch({ ticks })} placeholder="Ex.: Famílias" addLabel="Adicionar palavra" max={CONTENT_LIMITS.ticks} itemLabel="Palavra" />
        </Collapsible>
      )}
    </>
  );
}

interface PhotoForm {
  image: ImageValue;
  title: string;
  description: string;
  category: string;
  status: PublicationStatus;
  position: number;
}

export function PhotoEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useGallery();
  const sections = useSections();
  const queryClient = useQueryClient();
  const { confirm, toast, refreshSite } = useAdmin();
  const items = query.data ?? [];
  const index = items.findIndex((g) => g.id === id);
  const photo = items[index];
  const server = useMemo<PhotoForm | undefined>(
    () => (photo ? { image: photo.image, title: photo.title, description: photo.description, category: photo.category, status: photo.status, position: index } : undefined),
    [photo, index],
  );
  const d = useDraft<PhotoForm>(server);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ApiError | null>(null);
  const categories = useMemo(() => [...new Set(items.map((g) => g.category).filter(Boolean))], [items]);
  const isCover = !!photo && sections.data?.hero.image?.assetId === photo.image.assetId;

  async function save() {
    if (!d.draft || !photo) return;
    setSaving(true);
    setErrors(null);
    try {
      const f = d.draft;
      await adminApi.gallery.update(photo.id, {
        assetId: f.image.assetId ?? undefined,
        title: f.title,
        description: f.description,
        category: f.category,
        status: f.status,
        alt: f.image.alt,
        x: f.image.x,
        y: f.image.y,
        zoom: f.image.zoom,
        ratio: f.image.ratio,
      });
      let list = await adminApi.gallery.list();
      if (list.findIndex((g) => g.id === photo.id) !== f.position) list = await adminApi.gallery.reorder(moveTo(list.map((g) => g.id), photo.id, f.position));
      queryClient.setQueryData(adminKeys.gallery, list);
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      refreshSite();
      d.commit({ ...f, image: list.find((g) => g.id === photo.id)?.image ?? f.image });
      toast(f.status === 'published' ? 'Foto salva e publicada no site.' : 'Foto salva como rascunho.');
    } catch (err) {
      if (err instanceof ApiError) setErrors(err);
      toast(errorMessage(err), 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  useRegisterEditor({ dirty: d.dirty, saving, save: () => save().catch(() => undefined), discard: d.reset });

  async function remove() {
    if (!photo) return;
    if (!(await confirm({ title: 'Excluir esta foto?', text: 'A foto será removida da galeria e do armazenamento. Esta ação não pode ser desfeita.', confirmLabel: 'Excluir foto' }))) return;
    try {
      await adminApi.gallery.remove(photo.id);
      d.commit(d.draft!);
      queryClient.setQueryData(adminKeys.gallery, items.filter((g) => g.id !== photo.id));
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      refreshSite();
      toast('Foto excluída.');
      navigate('/admin/galeria');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function setCover() {
    if (!photo) return;
    if (d.dirty) {
      toast('Salve as alterações da foto antes de usá-la como capa.', 'info');
      return;
    }
    try {
      await adminApi.gallery.setCover(photo.id);
      void queryClient.invalidateQueries({ queryKey: adminKeys.sections });
      refreshSite();
      toast('Foto definida como capa do site.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  if (query.isPending) return <PageLoading />;
  if (query.isError) return <PageError error={query.error} onRetry={() => query.refetch()} />;
  if (!photo || !d.draft) return <EmptyState icon="image_not_supported" title="Foto não encontrada" text="Ela pode ter sido excluída." action={<Button onClick={() => navigate('/admin/galeria')}>Voltar para a galeria</Button>} />;
  const f = d.draft;

  return (
    <>
      <BackLink onClick={() => navigate('/admin/galeria')}>Galeria de fotos</BackLink>
      <PageHeader group="Galeria de fotos" title={<>Editar foto <StatusPill status={f.status} feminine /></>} />
      <Card title="Foto" description="Use “Ajustar enquadramento” para escolher a parte da foto que aparece. O formato define o tamanho do quadro na galeria.">
        <ImageField value={f.image} onChange={(image) => image && d.patch({ image })} purpose="gallery" frame="auto" maxHeight={360} allowRatio allowRemove={false} />
      </Card>
      <Card title="Informações">
        <TextField label="Título" value={f.title} maxLength={120} placeholder="Ex.: Irmãos brincando" onChange={(title) => d.patch({ title })} hint="Aparece sobre a foto quando o visitante passa o mouse e na foto ampliada." error={errors?.field('title')} />
        <TextAreaField label="Descrição (opcional)" rows={2} value={f.description} maxLength={500} onChange={(description) => d.patch({ description })} />
        <TextField label="Álbum (opcional)" list="gallery-albums" value={f.category} maxLength={60} placeholder="Ex.: Família" onChange={(category) => d.patch({ category })} hint="Organiza as fotos aqui no painel e aparece como etiqueta sobre a foto no site." />
        <Datalist id="gallery-albums" options={categories} />
      </Card>
      <Card title="Publicação e destaque">
        <SwitchRow
          title="Mostrar no site"
          help={f.status === 'published' ? 'A foto aparece na galeria do site.' : 'Fica salva como rascunho, só no painel.'}
          checked={f.status === 'published'}
          onChange={(on) => d.patch({ status: on ? 'published' : 'draft' })}
        />
        <div className={uiStyles.switchRow}>
          <span className={uiStyles.switchText}>
            <span className={uiStyles.switchTitle}>Foto de capa do site</span>
            <span className={uiStyles.switchHelp}>{isCover ? 'Esta é a foto de destaque da capa.' : 'Usa esta foto como imagem de destaque no topo do site.'}</span>
          </span>
          {isCover ? (
            <span className={styles.coverBadge}>
              <Icon name="star" size={14} />
              Capa atual
            </span>
          ) : (
            <Button icon="star" onClick={() => void setCover()}>
              Usar como capa
            </Button>
          )}
        </div>
        <SelectField label="Posição no site" value={String(f.position)} options={positionOptions(items.length)} onChange={(v) => d.patch({ position: Number(v) })} />
      </Card>
      <div className={styles.footer}>
        <Button variant="dangerGhost" icon="delete" onClick={() => void remove()}>
          Excluir foto
        </Button>
        <div className={styles.footerButtons}>
          <Button variant="outline" onClick={() => navigate('/admin/galeria')}>
            Cancelar
          </Button>
          <Button variant="primary" icon="check" loading={saving} disabled={!d.dirty} onClick={() => void save().catch(() => undefined)}>
            Salvar
          </Button>
        </div>
      </div>
    </>
  );
}
