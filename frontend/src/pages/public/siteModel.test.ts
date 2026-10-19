import { describe, expect, it } from 'vitest';
import { makeSite } from '../../test/fixtures';
import { buildSiteModel } from './siteModel';

describe('modelo do site público', () => {
  it('monta links do WhatsApp e do Instagram a partir das configurações', () => {
    const m = buildSiteModel(makeSite());
    expect(m.links.whatsapp).toBe('https://wa.me/5549999569245?text=Ol%C3%A1!');
    expect(m.links.packageLink('Mini Natal')).toContain(encodeURIComponent('Tenho interesse no Mini Natal'));
    expect(m.links.instagram).toBe('https://www.instagram.com/estudio/');
  });

  it('oculta seções sem conteúdo publicado', () => {
    const m = buildSiteModel(makeSite());
    expect(m.show).toEqual({ packages: false, gallery: false, faq: false, how: false });
  });

  it('sem WhatsApp configurado, os botões levam ao contato', () => {
    const site = makeSite();
    site.settings.whatsappNumber = '';
    expect(buildSiteModel(site).links.schedule).toBe('#contato');
  });
});
