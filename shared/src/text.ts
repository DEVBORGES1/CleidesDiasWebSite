/** Bloco de texto simples: parágrafo ou lista com marcadores. */
export type RichBlock = { type: 'paragraph'; text: string } | { type: 'list'; items: string[] };

/**
 * Converte o texto simples do painel em blocos. Linhas em branco separam
 * parágrafos; linhas iniciadas por "- ", "• " ou "* " viram itens de lista.
 */
export function parseRichText(input: string | null | undefined): RichBlock[] {
  const out: RichBlock[] = [];
  let para: { type: 'paragraph'; text: string } | null = null;
  let list: { type: 'list'; items: string[] } | null = null;
  for (const raw of String(input ?? '').split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-•*]\s+(.*)$/);
    if (!line) {
      para = null;
      list = null;
    } else if (bullet) {
      para = null;
      if (!list) {
        list = { type: 'list', items: [] };
        out.push(list);
      }
      list.items.push(bullet[1] ?? '');
    } else {
      list = null;
      if (!para) {
        para = { type: 'paragraph', text: line };
        out.push(para);
      } else para.text += '\n' + line;
    }
  }
  return out;
}

/** Texto de prévia de uma resposta, sem marcadores. */
export function plainPreview(input: string, max = 140): string {
  const flat = input.replace(/^[-•*]\s+/gm, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + '…' : flat;
}

export function slugify(input: string): string {
  return (
    input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'pacote'
  );
}

/** Formata um valor em reais: 590 → "590"; 349.9 → "349,90". */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '';
  const cents = Math.round(value * 100) % 100 !== 0;
  return value.toLocaleString('pt-BR', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
}

export function normalizeSearch(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Link do WhatsApp com mensagem pré-preenchida. */
export function whatsappLink(number: string, message = ''): string {
  const digits = number.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function instagramUrl(handle: string): string {
  const user = handle.replace(/[@/\s]/g, '');
  return user ? `https://www.instagram.com/${user}/` : '';
}

export const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
