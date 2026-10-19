import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDraft } from './useDraft';

describe('useDraft', () => {
  it('controla alterações pendentes, descarte e confirmação após salvar', () => {
    const { result, rerender } = renderHook(({ server }) => useDraft(server), { initialProps: { server: { title: 'A' } } });
    expect(result.current.dirty).toBe(false);
    act(() => result.current.patch({ title: 'B' }));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.reset());
    expect(result.current.draft).toEqual({ title: 'A' });

    act(() => result.current.patch({ title: 'C' }));
    act(() => result.current.commit({ title: 'C' }));
    expect(result.current.dirty).toBe(false);

    // Dados novos do servidor não sobrescrevem uma edição em andamento.
    act(() => result.current.patch({ title: 'D' }));
    rerender({ server: { title: 'Servidor' } });
    expect(result.current.draft).toEqual({ title: 'D' });
  });
});
