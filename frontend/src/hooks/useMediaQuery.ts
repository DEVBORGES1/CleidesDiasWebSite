import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Mesmo ponto de quebra do mockup: abaixo de 1000px o layout muda para celular/tablet. */
export const useCompact = () => useMediaQuery('(max-width: 999px)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
