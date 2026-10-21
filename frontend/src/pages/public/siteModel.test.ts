import { describe, expect, it } from 'vitest';
import { makeLots, makePackage, makeSite } from '../../test/fixtures';
import { buildSiteModel, businessJsonLd } from './siteModel';

describe('modelo do site público', () => {
  it('monta links do WhatsApp e do Instagram a partir das configurações', () => {
    const m = buildSiteModel(makeSite());
    expect(m.links.whatsapp).toBe('https://wa.me/5549999569245?text=Ol%C3%A1!');
    expect(m.links.packageLink('Mini Natal')).toContain(encodeURIComponent('Tenho interesse no Mini Natal'));
    expect(m.links.instagram).toBe('https://www.instagram.com/estudio/');
  });

  it('oculta seções sem conteúdo publicado', () => {
    const m = buildSiteModel(makeSite());
    expect(m.show).toEqual({ packages: false, gallery: false, faq: false, how: false, lots: false });
  });

  it('sem WhatsApp configurado, os botões levam ao contato', () => {
    const site = makeSite();
    site.settings.whatsappNumber = '';
    expect(buildSiteModel(site).links.schedule).toBe('#contato');
  });

  it('os pacotes mostram o valor do lote atual e o do próximo lote', () => {
    const mini = makePackage('mini', 'Mini Natal', 350, { promoPrice: 320 });
    const familia = makePackage('familia', 'Família', 790);
    const lots = makeLots([
      ['1º lote', '2026-10-31', { mini: 300 }],
      ['2º lote', '2026-11-30', { mini: 330 }],
      ['3º lote', '2026-12-15', { mini: 400 }],
    ]);
    const m = buildSiteModel(makeSite({ packages: [mini, familia], lots }));
    expect(m.priceOf(mini)).toMatchObject({ amount: 330, old: null, lot: { name: '2º lote' }, next: { price: 400, lot: { name: '3º lote' } } });
    // Pacote sem valor nos lotes continua com o preço normal e fica fora da tabela.
    expect(m.priceOf(familia)).toMatchObject({ amount: 790, lot: null, next: null });
    expect(m.lotPackages.map((p) => p.id)).toEqual(['mini']);
    expect(m.show.lots).toBe(true);
  });

  it('sem lotes, vale o preço promocional', () => {
    const mini = makePackage('mini', 'Mini Natal', 350, { promoPrice: 320 });
    expect(buildSiteModel(makeSite({ packages: [mini] })).priceOf(mini)).toMatchObject({ amount: 320, old: 350, lot: null });
  });

  it('dados estruturados usam só o que foi cadastrado', () => {
    const { settings } = makeSite();
    expect(businessJsonLd(settings, 'https://site.test')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: 'Cleides Dias',
      url: 'https://site.test/',
      telephone: '+5549999569245',
      sameAs: ['https://www.instagram.com/estudio/'],
    });
    settings.city = 'Videira – SC';
    settings.instagram = '';
    expect(businessJsonLd(settings, 'https://site.test', 'https://site.test/x.jpg')).toMatchObject({
      image: 'https://site.test/x.jpg',
      address: { '@type': 'PostalAddress', addressLocality: 'Videira', addressRegion: 'SC', addressCountry: 'BR' },
    });
    expect(businessJsonLd(settings, 'https://site.test')).not.toHaveProperty('sameAs');
  });
});
