import { useEffect } from 'react';

/** Trava a rolagem da página enquanto um menu/modal está aberto. */
export function useBodyLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const el = document.documentElement;
    const prev = el.style.overflowY;
    el.style.overflowY = 'hidden';
    return () => {
      el.style.overflowY = prev;
    };
  }, [locked]);
}
