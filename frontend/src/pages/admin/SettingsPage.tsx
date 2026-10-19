import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ImageField } from '../../components/admin/ImageField';
import { Button, Card, TextAreaField, TextField, uiStyles } from '../../components/admin/ui';
import { useAdmin } from '../../contexts/AdminContext';
import { adminKeys, useDashboard, useMediaStatus } from '../../hooks/useAdminData';
import { adminApi } from '../../services/api';
import { PageError, PageHeader, PageLoading, usePageEditors, useSettingsEditor } from './common';

const NAV_FIELDS = [
  ['inicio', 'Início'],
  ['pacotes', 'Pacotes'],
  ['galeria', 'Galeria'],
  ['sobre', 'Sobre'],
  ['sobreCompleto', 'Sobre (menu do celular)'],
  ['duvidas', 'Dúvidas'],
  ['contato', 'Contato'],
  ['agendar', 'Botão de agendar'],
  ['whatsappMenu', 'Botão de WhatsApp no celular'],
  ['botaoFlutuante', 'Botão flutuante'],
  ['verTodosPacotes', 'Link “ver todos os pacotes”'],
] as const;

export function SettingsPage() {
  const settings = useSettingsEditor();
  usePageEditors(settings);
  const { run, toast } = useAdmin();
  const media = useMediaStatus();
  const dashboard = useDashboard();
  const queryClient = useQueryClient();
  const [cleaning, setCleaning] = useState(false);
  const s = settings.value;
  const err = (p: string) => settings.errors?.field(p);

  return (
    <>
      <PageHeader group="Avançado" title="Configurações avançadas" description="Nome do estúdio, nomes do menu, mensagens automáticas do WhatsApp e dados para o Google. Raramente precisa mudar." />
      {settings.loading && <PageLoading />}
      {!!settings.error && <PageError error={settings.error} onRetry={() => location.reload()} />}
      {s && (
        <>
          <Card title="Marca" description="Aparece no topo do site, no menu e no rodapé.">
            <div className={uiStyles.grid2}>
              <TextField label="Nome do estúdio" value={s.brandName} maxLength={80} onChange={(brandName) => settings.patch({ brandName })} error={err('brandName')} />
              <TextField label="Subtítulo" value={s.brandSubtitle} maxLength={80} onChange={(brandSubtitle) => settings.patch({ brandSubtitle })} />
            </div>
            <div className={uiStyles.field}>
              <span className={uiStyles.label}>
                Logotipo <span className={uiStyles.labelNote}>· opcional</span>
              </span>
              <span className={uiStyles.hint}>Se enviado, substitui o ícone da câmera ao lado do nome no topo do site. Prefira PNG com fundo transparente.</span>
            </div>
            <ImageField value={s.logo} onChange={(logo) => settings.patch({ logo })} purpose="brand" frame="auto" maxHeight={120} />
          </Card>
          <Card title="Menu do site" description="Os links do menu são criados automaticamente: se uma seção não tiver nada publicado (por exemplo, nenhuma pergunta), ela some do menu. Aqui você só renomeia os links.">
            <div className={uiStyles.grid2}>
              {NAV_FIELDS.map(([key, label]) => (
                <TextField key={key} label={label} value={s.nav[key]} maxLength={60} onChange={(v) => settings.patch({ nav: { ...s.nav, [key]: v } })} />
              ))}
            </div>
          </Card>
          <Card title="Mensagens automáticas do WhatsApp" description="O texto que já vem escrito quando o visitante toca em um botão.">
            <TextAreaField label="Botão geral de WhatsApp" rows={2} maxLength={500} value={s.whatsappMessages.general} onChange={(general) => settings.patch({ whatsappMessages: { ...s.whatsappMessages, general } })} />
            <TextAreaField label="Botão “Agendar”" rows={2} maxLength={500} value={s.whatsappMessages.schedule} onChange={(schedule) => settings.patch({ whatsappMessages: { ...s.whatsappMessages, schedule } })} />
            <TextAreaField
              label="Ao escolher um pacote"
              rows={2}
              maxLength={500}
              value={s.whatsappMessages.package}
              onChange={(pkg) => settings.patch({ whatsappMessages: { ...s.whatsappMessages, package: pkg } })}
              hint="Escreva {pacote} onde o nome do pacote deve aparecer."
            />
          </Card>
          <Card title="Google e compartilhamento" description="Como o site aparece nas buscas e quando o link é compartilhado no WhatsApp ou nas redes.">
            <TextField label="Título da página" value={s.seo.title} maxLength={70} onChange={(title) => settings.patch({ seo: { ...s.seo, title } })} hint={`${s.seo.title.length}/70 caracteres.`} error={err('seo.title')} />
            <TextAreaField label="Descrição" rows={2} value={s.seo.description} maxLength={170} onChange={(description) => settings.patch({ seo: { ...s.seo, description } })} hint={`${s.seo.description.length}/170 caracteres.`} />
            <ImageField value={s.seoImage} onChange={(seoImage) => settings.patch({ seoImage })} purpose="brand" frame="1200/630" maxHeight={200} showAlt={false} />
          </Card>
        </>
      )}
      {media.data?.enabled && (
        <Card title="Armazenamento de fotos" description="Fotos enviadas e não usadas (ou substituídas) ficam guardadas por 24 horas, para você poder desfazer. Depois disso podem ser removidas do Cloudinary.">
          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>
            {dashboard.data ? `${dashboard.data.unusedMedia} foto(s) sem uso prontas para remoção.` : 'Verificando…'}
          </span>
          <div>
            <Button
              icon="cleaning_services"
              loading={cleaning}
              disabled={!dashboard.data?.unusedMedia}
              onClick={async () => {
                setCleaning(true);
                const r = await run(() => adminApi.media.cleanup());
                setCleaning(false);
                if (r) {
                  toast(r.failed ? `${r.removed} removida(s); ${r.failed} serão tentadas de novo depois.` : `${r.removed} foto(s) removida(s).`);
                  void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
                }
              }}
            >
              Limpar fotos sem uso
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
