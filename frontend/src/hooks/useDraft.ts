import { useCallback, useEffect, useState } from 'react';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Cópia local editável de um dado do servidor. Indica se há alterações
 * pendentes e permite descartar. Quando o servidor devolve dados novos e
 * não há edição em andamento, a cópia local é atualizada.
 */
export function useDraft<T>(server: T | undefined) {
  const [state, setState] = useState<{ base: T | undefined; draft: T | undefined }>({ base: server, draft: server });

  useEffect(() => {
    if (server === undefined) return;
    setState((st) => {
      if (same(st.base, server)) return st;
      const editing = st.draft !== undefined && !same(st.draft, st.base);
      return { base: server, draft: editing ? st.draft : server };
    });
  }, [server]);

  const { base, draft } = state;
  const dirty = draft !== undefined && base !== undefined && !same(draft, base);
  const setDraft = useCallback((next: T | ((d: T) => T)) => {
    setState((st) => (st.draft === undefined ? st : { ...st, draft: typeof next === 'function' ? (next as (d: T) => T)(st.draft) : next }));
  }, []);
  const patch = useCallback((p: Partial<T>) => setState((st) => (st.draft === undefined ? st : { ...st, draft: { ...st.draft, ...p } })), []);
  const reset = useCallback(() => setState((st) => ({ ...st, draft: st.base })), []);
  /** Usado após salvar: a resposta do servidor vira a nova base. */
  const commit = useCallback((value: T) => setState({ base: value, draft: value }), []);

  return { draft, setDraft, patch, dirty, reset, commit };
}
