export interface AdminNavItem {
  id: string;
  path: string;
  label: string;
  icon: string;
  group: 'Painel' | 'Conteúdo do site' | 'Vendas e serviços' | 'Avançado';
  /** Seção do site correspondente (para a prévia acompanhar a página aberta). */
  sec?: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { id: 'dashboard', path: '/admin', label: 'Visão geral', icon: 'space_dashboard', group: 'Painel', sec: 'inicio' },
  { id: 'inicio', path: '/admin/inicio', label: 'Início', icon: 'home', group: 'Conteúdo do site', sec: 'inicio' },
  { id: 'sobre', path: '/admin/sobre', label: 'Sobre a fotógrafa', icon: 'person', group: 'Conteúdo do site', sec: 'sobre' },
  { id: 'galeria', path: '/admin/galeria', label: 'Galeria de fotos', icon: 'photo_library', group: 'Conteúdo do site', sec: 'galeria' },
  { id: 'como', path: '/admin/como-funciona', label: 'Como funciona', icon: 'route', group: 'Conteúdo do site', sec: 'como-funciona' },
  { id: 'faq', path: '/admin/duvidas', label: 'Dúvidas frequentes', icon: 'help', group: 'Conteúdo do site', sec: 'duvidas' },
  { id: 'contato', path: '/admin/contato', label: 'Contato e rodapé', icon: 'chat', group: 'Conteúdo do site', sec: 'contato' },
  { id: 'pacotes', path: '/admin/pacotes', label: 'Pacotes e valores', icon: 'sell', group: 'Vendas e serviços', sec: 'pacotes' },
  { id: 'lotes', path: '/admin/lotes', label: 'Valores por lote', icon: 'confirmation_number', group: 'Vendas e serviços', sec: 'lotes' },
  { id: 'config', path: '/admin/configuracoes', label: 'Configurações avançadas', icon: 'tune', group: 'Avançado', sec: 'inicio' },
];

/** Seção clicada na prévia → página do painel que a edita. */
export const SEC_TO_PATH: Record<string, string> = {
  inicio: '/admin/inicio',
  beneficios: '/admin/inicio',
  pacotes: '/admin/pacotes',
  galeria: '/admin/galeria',
  faixa: '/admin/galeria',
  sobre: '/admin/sobre',
  'como-funciona': '/admin/como-funciona',
  lotes: '/admin/lotes',
  duvidas: '/admin/duvidas',
  contato: '/admin/contato',
  rodape: '/admin/contato',
  cabecalho: '/admin/configuracoes',
};

export function navItemFor(pathname: string): AdminNavItem | undefined {
  return [...ADMIN_NAV].sort((a, b) => b.path.length - a.path.length).find((n) => pathname === n.path || pathname.startsWith(`${n.path}/`));
}
