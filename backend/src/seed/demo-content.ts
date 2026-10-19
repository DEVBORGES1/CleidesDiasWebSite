/**
 * Conteúdo inicial de demonstração, extraído dos mockups aprovados.
 * Nunca sobrescreve informações reais: coleções só são semeadas quando estão
 * vazias, seções só quando ainda não existem e as configurações só quando o
 * contato ainda não foi preenchido.
 */
import type { SiteSections } from '@cleides/shared';
import { sectionSchemas } from '@cleides/shared';
import type { Logger } from 'pino';
import type { Repositories } from '../repositories/types.js';

const ABOUT_IMAGE = {
  assetId: null,
  url: '/images/cleides.jpg',
  publicId: null,
  width: 1200,
  height: 1486,
  alt: 'Cleides Dias, fotógrafa, sorrindo no estúdio',
  x: 50,
  y: 30,
  zoom: 1,
  ratio: 'auto' as const,
};

export const DEMO_SECTIONS: SiteSections = {
  hero: sectionSchemas.hero.parse({
    eyebrow: 'Natal é sobre amor',
    title: 'Registre a magia deste Natal',
    text: 'Ensaio fotográfico com todo o carinho para eternizar momentos especiais com quem você ama.',
    primaryButton: 'Conheça os pacotes',
    secondaryButton: 'Ver galeria',
    benefits: ['Atendimento personalizado', 'Fotos em alta resolução', 'Cenários temáticos de Natal', 'Qualidade e muito carinho'],
    image: null,
  }),
  about: sectionSchemas.about.parse({
    eyebrow: 'Quem vai fotografar vocês',
    titleStart: 'Prazer, eu sou a',
    titleHighlight: 'Cleides.',
    text:
      'Sou fotógrafa em Videira – SC e meu trabalho é transformar momentos simples em lembranças que atravessam gerações — o primeiro Natal do bebê, o sorriso dos irmãos, o abraço apertado da família.\n\n' +
      'No estúdio, cada ensaio acontece no tempo de vocês: com calma, carinho e atenção a cada detalhe, para que as fotos mostrem quem vocês realmente são.',
    highlights: [
      'Ensaios conduzidos com paciência, no ritmo das crianças',
      'Cenários natalinos preparados com cuidado',
      'Atendimento próximo, do primeiro contato à entrega',
    ],
    cardName: 'Cleides Dias',
    cardRole: 'Fotógrafa · Videira – SC',
    ctaLabel: 'Falar com a Cleides',
    ctaTarget: 'whatsapp',
    image: ABOUT_IMAGE,
  }),
  packages: sectionSchemas.packages.parse({
    title: 'Nossos pacotes',
    subtitle: 'Escolha o pacote ideal para registrar esse momento especial',
    mobileHint: 'Toque em um pacote para ver todos os detalhes',
    featuredBadge: 'Mais escolhido',
    questionLead: 'Ficou em dúvida?',
    questionButton: 'Fale com a gente no WhatsApp',
  }),
  gallery: sectionSchemas.gallery.parse({
    title: 'Galeria',
    subtitle: 'Alguns momentos especiais',
    buttonLabel: 'Ver galeria completa',
    ticks: ['Bebês', 'Crianças', 'Famílias', 'Casais', 'Pais e filhos', 'Especial de Natal 2026'],
  }),
  how: sectionSchemas.how.parse({
    title: 'Como funciona',
    subtitle: 'Do primeiro “oi” às fotos nas suas mãos',
    note: 'A data só é garantida após a confirmação do estúdio.',
    stepPrefix: 'Passo',
    chatName: 'Cleides · Fotografia',
    chatStatus: 'online',
    chatMessages: [
      { fromClient: true, text: 'Oi! Quero agendar um ensaio de Natal.' },
      { fromClient: false, text: 'Olá! Que alegria. O ensaio é para quem?' },
      { fromClient: true, text: 'Para a minha filha de 8 meses.' },
      { fromClient: false, text: 'Que fofura! O Mini Natal é perfeito para bebês. Qual data você prefere?' },
      { fromClient: true, text: 'Dia 12/12, pela manhã.' },
      { fromClient: false, text: 'Data confirmada! Já te envio as dicas de roupa.' },
    ],
    chatButton: 'Começar minha conversa',
  }),
  faq: sectionSchemas.faq.parse({ title: 'Dúvidas frequentes', subtitle: 'Tudo o que você precisa saber' }),
  contact: sectionSchemas.contact.parse({
    eyebrow: 'Vamos registrar esse momento?',
    title: 'Entre em contato e agende seu ensaio!',
    text: 'Chame no WhatsApp, conte quem vai participar e a data que você deseja. Respondemos com as datas disponíveis e todos os detalhes.',
    buttonLabel: 'Agendar pelo WhatsApp',
    note: 'A data é confirmada pelo estúdio durante a conversa.',
    image: null,
  }),
  legal: sectionSchemas.legal.parse({
    privacyText:
      'Este texto é um modelo e deve ser revisado pelo estúdio antes da publicação.\n\n' +
      'O estúdio Cleides Dias Fotografia respeita a sua privacidade. Este site não possui formulários de cadastro: o contato acontece diretamente pelo WhatsApp ou Instagram, e as informações trocadas nesses canais são usadas apenas para responder ao seu pedido, organizar o agendamento e entregar as fotografias.\n\n' +
      'Tratamento de dados\n\n' +
      '- Os dados compartilhados na conversa (nome, telefone e informações do ensaio) são usados somente para o atendimento.\n' +
      '- As fotografias são protegidas por direitos autorais e só são publicadas com autorização.\n' +
      '- Você pode pedir a qualquer momento a correção ou exclusão dos seus dados pelos canais de contato.',
  }),
};

export async function seedDemoContent(repos: Repositories, logger?: Logger): Promise<string[]> {
  const done: string[] = [];

  for (const key of Object.keys(DEMO_SECTIONS) as (keyof SiteSections)[]) {
    if (await repos.sections.insertIfMissing(key, DEMO_SECTIONS[key])) done.push(`seção ${key}`);
  }

  const settings = await repos.settings.get();
  if (!settings.whatsappNumber && !settings.phoneDisplay && !settings.instagram) {
    await repos.settings.update(
      {
        brandName: 'Cleides Dias',
        brandSubtitle: 'Estúdio Fotográfico',
        whatsappNumber: '5549999569245',
        phoneDisplay: '(49) 99956-9245',
        phoneLabel: 'WhatsApp',
        instagram: '@estudiocleidesdias',
        instagramLabel: 'Instagram',
        city: 'Videira – SC',
        cityNote: 'Atendemos toda a região',
        whatsappMessages: {
          general: 'Olá! Gostaria de saber mais sobre os ensaios de Natal 2026.',
          schedule: 'Olá! Gostaria de agendar um ensaio do Especial de Natal 2026. Pode me passar as datas disponíveis?',
          package: 'Olá! Tenho interesse no pacote {pacote} do Especial de Natal 2026. Pode me passar as datas disponíveis?',
        },
        footer: {
          tagline: 'Mais do que fotos, são lembranças para sempre.',
          legal:
            '© 2026 Cleides Dias Estúdio Fotográfico · Especial de Natal 2026 · WhatsApp (49) 99956-9245 · @estudiocleidesdias. Fotografias protegidas por direitos autorais — reprodução proibida sem autorização.',
          privacyLabel: 'Política de privacidade',
          dataLabel: 'Tratamento de dados',
        },
        seo: {
          title: 'Cleides Dias Fotografia · Ensaios de Natal em Videira – SC',
          description:
            'Ensaios fotográficos de Natal para bebês, crianças e famílias em Videira – SC. Conheça os pacotes e agende pelo WhatsApp.',
        },
      },
      null,
    );
    done.push('configurações');
  }

  if ((await repos.packages.stats()).total === 0) {
    const packages = [
      {
        slug: 'mini-natal',
        name: 'Mini Natal',
        subtitle: 'Ensaio rápido, com todo o encanto do Natal.',
        description: 'Ensaio rápido, com todo o encanto do Natal. Ideal para bebês e crianças pequenas, em um ritmo tranquilo e acolhedor.',
        price: 350,
        highlights: [
          { type: 'duracao' as const, value: 'Até 30 min' },
          { type: 'fotos' as const, value: '5 fotos' },
          { type: 'cenarios' as const, value: '1 cenário' },
        ],
        includedItems: ['Até 30 minutos de ensaio', '5 fotos digitais em alta resolução', '1 cenário temático'],
        featured: false,
      },
      {
        slug: 'natal-completo',
        name: 'Natal Completo',
        subtitle: 'A experiência perfeita para registrar mais momentos.',
        description: 'A experiência perfeita para registrar mais momentos — mais tempo, mais cenários e espaço para incluir a família.',
        price: 590,
        highlights: [
          { type: 'duracao' as const, value: 'Até 1 hora' },
          { type: 'fotos' as const, value: '10 fotos' },
          { type: 'cenarios' as const, value: '2 cenários' },
          { type: 'participantes' as const, value: 'Com a família' },
        ],
        includedItems: ['Até 1 hora de ensaio', '10 fotos digitais em alta resolução', '2 cenários temáticos', 'Fotos com a família'],
        featured: true,
      },
      {
        slug: 'experiencia-familia',
        name: 'Experiência Família',
        subtitle: 'Uma celebração completa do amor e da união.',
        description: 'Uma celebração completa do amor e da união, para reunir pais, filhos e irmãos em um só ensaio.',
        price: 790,
        highlights: [
          { type: 'duracao' as const, value: 'Até 1h30' },
          { type: 'fotos' as const, value: '20 fotos' },
          { type: 'cenarios' as const, value: '2 cenários' },
          { type: 'extra' as const, value: 'Álbum impresso' },
        ],
        includedItems: [
          'Até 1h30 de ensaio',
          '20 fotos digitais em alta resolução',
          '2 cenários temáticos',
          'Fotos com a família, pais e irmãos',
          'Álbum impresso (15x21)',
        ],
        featured: false,
      },
    ];
    for (const [position, p] of packages.entries()) {
      await repos.packages.create({
        ...p,
        category: 'Natal 2026',
        promoPrice: null,
        extraInfo: '',
        cover: null,
        coverOnCard: false,
        photos: [],
        status: 'published',
        position,
      });
    }
    done.push('pacotes');
  }

  if ((await repos.faq.stats()).total === 0) {
    const faqs: [string, string][] = [
      [
        'Como funciona o ensaio de Natal?',
        'O ensaio acontece em um dos nossos cenários natalinos, já montados e iluminados. Conduzimos tudo com calma, no tempo de cada criança. A duração e a quantidade de fotos variam conforme o pacote.',
      ],
      [
        'Quais roupas são recomendadas?',
        'Tons claros e neutros — creme, bege, branco, verde ou vinho suave — combinam com os cenários. O estúdio pode orientar sobre as combinações antes do ensaio.',
      ],
      [
        'Posso fotografar com toda a família?',
        'Sim! A Experiência Família foi pensada para isso. Para grupos maiores, fale com o estúdio para verificar as possibilidades.',
      ],
      [
        'Como funciona o agendamento?',
        'Basta chamar no WhatsApp com a data desejada. O estúdio verifica a disponibilidade e responde com as condições para confirmar a reserva.',
      ],
      ['Qual é o prazo de entrega das fotografias?', 'O prazo de entrega será informado pelo estúdio no momento da contratação.'],
      ['Como funciona o pagamento?', 'As formas e condições de pagamento serão informadas pelo estúdio durante o atendimento.'],
      [
        'Posso reagendar meu ensaio?',
        'As regras de reagendamento serão definidas pelo estúdio e informadas antes da confirmação da data.',
      ],
    ];
    for (const [position, [question, answer]] of faqs.entries()) {
      await repos.faq.create({ question, answer, category: '', status: 'published', position });
    }
    done.push('dúvidas frequentes');
  }

  if ((await repos.steps.stats()).total === 0) {
    const steps = [
      { icon: 'chat' as const, title: 'Chame no WhatsApp', description: 'Conte quem vai participar e a data que você deseja.' },
      { icon: 'calendar_month' as const, title: 'Escolha pacote e data', description: 'Verificamos a disponibilidade e confirmamos tudo com você.' },
      { icon: 'payments' as const, title: 'Pagamento da taxa de reserva', description: 'Uma taxa de reserva garante a sua data na agenda.' },
      {
        icon: 'photo_library' as const,
        title: 'Viva o ensaio',
        description: 'É só chegar e aproveitar. As fotos são entregues conforme o pacote contratado.',
      },
    ];
    for (const [position, s] of steps.entries()) {
      await repos.steps.create({ ...s, note: '', image: null, status: 'published', position });
    }
    done.push('etapas');
  }

  logger?.info({ seeded: done }, done.length ? 'Conteúdo de demonstração inserido' : 'Nada a semear: o conteúdo já existe');
  return done;
}
