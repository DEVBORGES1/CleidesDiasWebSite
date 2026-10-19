import { ImageField } from '../../components/admin/ImageField';
import { Card, ListEditor, TextAreaField, TextField, uiStyles } from '../../components/admin/ui';
import { Icon } from '../../components/Icon';
import { PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor } from './common';
import styles from './forms.module.css';

const CTA_OPTIONS = [
  { value: 'whatsapp', icon: 'chat', label: 'WhatsApp', desc: 'Abre uma conversa com a mensagem automática.' },
  { value: 'instagram', icon: 'photo_camera', label: 'Instagram', desc: 'Abre o seu perfil no Instagram.' },
  { value: 'contato', icon: 'south', label: 'Seção de contato', desc: 'Rola a página até o bloco de agendamento.' },
] as const;

export function AboutPage() {
  const about = useSectionEditor('about');
  usePageEditors(about);
  const v = about.value;

  return (
    <>
      <PageHeader group="Conteúdo do site" title="Sobre a fotógrafa" description="Sua apresentação, sua foto e o que torna o seu trabalho especial." />
      {about.loading && <PageLoading />}
      {!!about.error && <PageError error={about.error} onRetry={() => location.reload()} />}
      {v && (
        <>
          <Card title="Apresentação" description="O texto em que você se apresenta para as famílias.">
            <TextField label="Chamada pequena" value={v.eyebrow} maxLength={80} onChange={(eyebrow) => about.patch({ eyebrow })} />
            <div className={uiStyles.grid2}>
              <TextField label="Início do título" value={v.titleStart} maxLength={80} onChange={(titleStart) => about.patch({ titleStart })} />
              <TextField label="Destaque do título" value={v.titleHighlight} maxLength={60} onChange={(titleHighlight) => about.patch({ titleHighlight })} hint="Aparece em itálico dourado." />
            </div>
            <div className={styles.previewBox}>
              <span className={styles.previewLabel}>Como aparece no site</span>
              <span className={styles.previewTitle}>
                {v.titleStart} <em>{v.titleHighlight}</em>
              </span>
            </div>
            <TextAreaField label="Texto de apresentação" rows={7} value={v.text} maxLength={3000} onChange={(text) => about.patch({ text })} hint="Deixe uma linha em branco entre um parágrafo e outro." />
          </Card>
          <Card title="Sua foto" description="Aparece ao lado da apresentação, em formato retrato, com seu nome sobre ela.">
            <ImageField value={v.image} onChange={(image) => about.patch({ image })} purpose="section" frame="1500/1857" maxHeight={340} />
            <div className={uiStyles.grid2}>
              <TextField label="Nome sobre a foto" value={v.cardName} maxLength={60} onChange={(cardName) => about.patch({ cardName })} />
              <TextField label="Legenda sobre a foto" value={v.cardRole} maxLength={80} onChange={(cardRole) => about.patch({ cardRole })} />
            </div>
          </Card>
          <Card title="Diferenciais" description="Lista com marcadores exibida abaixo do texto. Use frases curtas.">
            <ListEditor items={v.highlights} onChange={(highlights) => about.patch({ highlights })} placeholder="Ex.: Ensaios no ritmo das crianças" addLabel="Adicionar diferencial" itemLabel="Diferencial" />
          </Card>
          <Card title="Botão de contato" description="Escolha o texto e para onde o botão leva.">
            <TextField label="Texto do botão" value={v.ctaLabel} maxLength={40} onChange={(ctaLabel) => about.patch({ ctaLabel })} />
            <div className={styles.radioGroup} role="radiogroup" aria-label="Destino do botão">
              {CTA_OPTIONS.map((o) => (
                <button key={o.value} type="button" role="radio" aria-checked={v.ctaTarget === o.value} className={styles.radio} onClick={() => about.patch({ ctaTarget: o.value })}>
                  <Icon name={o.icon} size={20} />
                  <span className={styles.radioText}>
                    <span className={styles.radioLabel}>{o.label}</span>
                    <span className={styles.radioDesc}>{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
