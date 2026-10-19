import { whatsappLink } from '@cleides/shared/utils';
import { Icon } from '../../components/Icon';
import { ImageField } from '../../components/admin/ImageField';
import { Button, Card, IconButton, TextAreaField, TextField, uiStyles } from '../../components/admin/ui';
import { PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor, useSettingsEditor } from './common';
import styles from './forms.module.css';

export function ContactPage() {
  const settings = useSettingsEditor();
  const contact = useSectionEditor('contact');
  const legal = useSectionEditor('legal');
  usePageEditors(settings, contact, legal);
  const s = settings.value;
  const c = contact.value;
  const l = legal.value;
  const sErr = (p: string) => settings.errors?.field(p);
  const digits = s?.whatsappNumber.replace(/\D/g, '') ?? '';
  const waInvalid = digits.length > 0 && !/^55\d{10,11}$/.test(digits);

  return (
    <>
      <PageHeader group="Conteúdo do site" title="Contato e rodapé" description="WhatsApp, redes sociais, a chamada final para agendamento e o rodapé." />
      {(settings.loading || contact.loading) && <PageLoading />}
      {!!(settings.error || contact.error) && <PageError error={settings.error ?? contact.error} onRetry={() => location.reload()} />}
      {s && (
        <>
          <Card title="WhatsApp" description="Todos os botões de agendamento do site levam para este número.">
            <TextField
              label="Número do WhatsApp"
              inputMode="tel"
              value={s.whatsappNumber}
              onChange={(whatsappNumber) => settings.patch({ whatsappNumber })}
              hint="Só números, com 55 e o DDD. Ex.: 5549999569245"
              error={waInvalid ? 'Confira o número: use só números, começando com 55 e o DDD.' : sErr('whatsappNumber')}
            />
            {digits && !waInvalid && (
              <a href={whatsappLink(digits, s.whatsappMessages.general)} target="_blank" rel="noopener" className={styles.inlineLink}>
                <Icon name="open_in_new" size={16} />
                Testar o link do WhatsApp
              </a>
            )}
            <div className={uiStyles.grid2}>
              <TextField label="Telefone exibido" value={s.phoneDisplay} maxLength={40} onChange={(phoneDisplay) => settings.patch({ phoneDisplay })} />
              <TextField label="Legenda do telefone" value={s.phoneLabel} maxLength={40} onChange={(phoneLabel) => settings.patch({ phoneLabel })} />
            </div>
          </Card>
          <Card title="Redes e localização">
            <div className={uiStyles.grid2}>
              <TextField label="Instagram" value={s.instagram} maxLength={31} onChange={(instagram) => settings.patch({ instagram })} hint="Com @, ex.: @estudiocleidesdias" error={sErr('instagram')} />
              <TextField label="Legenda do Instagram" value={s.instagramLabel} maxLength={40} onChange={(instagramLabel) => settings.patch({ instagramLabel })} />
            </div>
            <div className={uiStyles.grid2}>
              <TextField label="Cidade" value={s.city} maxLength={80} onChange={(city) => settings.patch({ city })} />
              <TextField label="Legenda da cidade" value={s.cityNote} maxLength={80} onChange={(cityNote) => settings.patch({ cityNote })} />
            </div>
            <TextField label="E-mail de contato (opcional)" type="email" value={s.email} maxLength={120} onChange={(email) => settings.patch({ email })} error={sErr('email')} hint="Se preenchido, aparece no bloco de contato." />
            <div className={styles.subhead}>
              <span className={styles.subheadTitle}>Outras redes sociais (opcional)</span>
              <span className={styles.subheadText}>Aparecem como links no rodapé. Ex.: Facebook, TikTok.</span>
            </div>
            {s.socialLinks.map((link, i) => (
              <div key={i} className={styles.row}>
                <div style={{ flex: '0 1 180px' }}>
                  <TextField label="Nome" value={link.label} maxLength={40} onChange={(label) => settings.patch({ socialLinks: s.socialLinks.map((x, j) => (j === i ? { ...x, label } : x)) })} />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField label="Endereço" placeholder="https://" value={link.url} maxLength={300} onChange={(url) => settings.patch({ socialLinks: s.socialLinks.map((x, j) => (j === i ? { ...x, url } : x)) })} error={sErr(`socialLinks.${i}`)} />
                </div>
                <IconButton icon="close" label="Remover rede" style={{ marginTop: 24 }} onClick={() => settings.patch({ socialLinks: s.socialLinks.filter((_, j) => j !== i) })} />
              </div>
            ))}
            {s.socialLinks.length < 6 && (
              <Button variant="dashed" icon="add" onClick={() => settings.patch({ socialLinks: [...s.socialLinks, { label: '', url: 'https://' }] })}>
                Adicionar rede social
              </Button>
            )}
          </Card>
        </>
      )}
      {c && (
        <Card title="Chamada para agendamento" description="O bloco final do site, com foto e o botão principal de agendamento.">
          <ImageField value={c.image} onChange={(image) => contact.patch({ image })} purpose="section" frame="1/1" maxHeight={240} />
          <TextField label="Chamada pequena" value={c.eyebrow} maxLength={80} onChange={(eyebrow) => contact.patch({ eyebrow })} />
          <TextField label="Título" value={c.title} maxLength={140} onChange={(title) => contact.patch({ title })} />
          <TextAreaField label="Texto" value={c.text} maxLength={500} onChange={(text) => contact.patch({ text })} />
          <div className={uiStyles.grid2}>
            <TextField label="Botão" value={c.buttonLabel} maxLength={50} onChange={(buttonLabel) => contact.patch({ buttonLabel })} />
            <TextField label="Aviso abaixo do botão" value={c.note} maxLength={160} onChange={(note) => contact.patch({ note })} />
          </div>
        </Card>
      )}
      {s && (
        <Card title="Rodapé">
          <TextField label="Frase do rodapé" value={s.footer.tagline} maxLength={200} onChange={(tagline) => settings.patch({ footer: { ...s.footer, tagline } })} />
          <TextAreaField label="Texto legal" value={s.footer.legal} maxLength={1000} onChange={(legal) => settings.patch({ footer: { ...s.footer, legal } })} />
          <div className={uiStyles.grid2}>
            <TextField label="Link de privacidade" value={s.footer.privacyLabel} maxLength={60} onChange={(privacyLabel) => settings.patch({ footer: { ...s.footer, privacyLabel } })} />
            <TextField label="Link de dados" value={s.footer.dataLabel} maxLength={60} onChange={(dataLabel) => settings.patch({ footer: { ...s.footer, dataLabel } })} />
          </div>
        </Card>
      )}
      {l && (
        <Card title="Política de privacidade" description="Texto da página aberta pelos links do rodapé. Linhas curtas sem ponto final viram subtítulos; “- ” no início cria listas.">
          <TextAreaField label="Texto da política" rows={10} value={l.privacyText} maxLength={20000} onChange={(privacyText) => legal.patch({ privacyText })} />
          <a href="/privacidade" target="_blank" rel="noopener" className={styles.inlineLink}>
            <Icon name="open_in_new" size={16} />
            Ver página publicada
          </a>
        </Card>
      )}
    </>
  );
}
