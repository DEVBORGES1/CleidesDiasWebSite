import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { buildSiteModel } from '../../pages/public/siteModel';
import { makeSite } from '../../test/fixtures';
import { FaqSection } from './FaqSection';

const faq = (id: string, question: string, answer: string, status: 'published' | 'draft' = 'published') => ({
  id,
  question,
  answer,
  category: '',
  status,
  position: 0,
  createdAt: '',
  updatedAt: '',
});

describe('FaqSection', () => {
  it('renderiza parágrafos e listas e alterna o acordeão', async () => {
    const model = buildSiteModel(
      makeSite({ faq: [faq('1', 'Como funciona?', 'Explicação.\n\n- Item A\n- Item B'), faq('2', 'Pagamento?', 'Pix.', 'draft')], preview: true }),
    );
    render(<FaqSection model={model} />);
    const first = screen.getByRole('button', { name: 'Como funciona?' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Item A').tagName).toBe('LI');
    expect(screen.getByText('Rascunho')).toBeInTheDocument();

    const second = screen.getByRole('button', { name: /Pagamento\?/ });
    await userEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });
});
