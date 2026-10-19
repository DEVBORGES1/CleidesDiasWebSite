import { ImageField } from '../../components/admin/ImageField';
import { Card, TextAreaField, TextField, uiStyles } from '../../components/admin/ui';
import { PageError, PageHeader, PageLoading, usePageEditors, useSectionEditor } from './common';

export function HeroPage() {
  const hero = useSectionEditor('hero');
  usePageEditors(hero);
  const v = hero.value;
  const err = (p: string) => hero.errors?.field(p);

  return (
    <>
      <PageHeader group="Conteúdo do site" title="Início" description="A primeira coisa que o visitante vê: foto de destaque, título e chamadas." />
      {hero.loading && <PageLoading />}
      {!!hero.error && <PageError error={hero.error} onRetry={() => location.reload()} />}
      {v && (
        <>
          <Card title="Imagem de destaque" description="A foto principal da capa. No computador ocupa o lado direito; no celular aparece quadrada, no topo.">
            <ImageField value={v.image} onChange={(image) => hero.patch({ image })} purpose="section" frame="4/3" maxHeight={260} />
          </Card>
          <Card title="Textos da capa">
            <TextField label="Chamada pequena" value={v.eyebrow} maxLength={80} onChange={(eyebrow) => hero.patch({ eyebrow })} hint="Aparece acima do título, em letras maiúsculas." error={err('eyebrow')} />
            <TextField label="Título principal" value={v.title} maxLength={140} onChange={(title) => hero.patch({ title })} error={err('title')} />
            <TextAreaField label="Texto de apoio" value={v.text} maxLength={400} onChange={(text) => hero.patch({ text })} error={err('text')} />
          </Card>
          <Card title="Botões" description="O botão principal leva aos pacotes; o secundário, à galeria (aparece quando há fotos publicadas).">
            <div className={uiStyles.grid2}>
              <TextField label="Botão principal" value={v.primaryButton} maxLength={40} onChange={(primaryButton) => hero.patch({ primaryButton })} />
              <TextField label="Botão secundário" value={v.secondaryButton} maxLength={40} onChange={(secondaryButton) => hero.patch({ secondaryButton })} />
            </div>
          </Card>
          <Card title="Faixa de benefícios" description="Os quatro destaques exibidos logo abaixo da capa. Deixe em branco para esconder um item.">
            <div className={uiStyles.grid2}>
              {[0, 1, 2, 3].map((i) => (
                <TextField
                  key={i}
                  label={`Benefício ${i + 1}`}
                  value={v.benefits[i] ?? ''}
                  maxLength={80}
                  onChange={(text) => {
                    const benefits = [0, 1, 2, 3].map((j) => (j === i ? text : (v.benefits[j] ?? '')));
                    hero.patch({ benefits });
                  }}
                />
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
