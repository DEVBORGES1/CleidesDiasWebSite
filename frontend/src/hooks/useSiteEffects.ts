import { useEffect, useState, type RefObject } from 'react';

const SECTIONS = ['inicio', 'pacotes', 'galeria', 'sobre', 'duvidas', 'contato'] as const;
export type SectionId = (typeof SECTIONS)[number];

/** Animação de entrada dos blocos marcados com data-reveal / data-cascade (igual ao mockup). */
export function useReveal(root: RefObject<HTMLElement | null>, ready: boolean, disabled: boolean): void {
  useEffect(() => {
    const el = root.current;
    if (!ready || disabled || !el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const t = en.target as HTMLElement;
          t.style.opacity = '1';
          t.style.transform = 'none';
          io.unobserve(t);
        }),
      { rootMargin: '0px 0px -6% 0px' },
    );
    const vh = window.innerHeight;
    el.querySelectorAll<HTMLElement>('[data-reveal]').forEach((n) => {
      if (n.getBoundingClientRect().top < vh) return;
      n.style.opacity = '0';
      n.style.transform = 'translateY(18px)';
      n.style.transition = 'opacity .9s ease, transform .9s cubic-bezier(.2,.7,.2,1)';
      io.observe(n);
    });
    el.querySelectorAll<HTMLElement>('[data-cascade]').forEach((n, i) => {
      if (n.getBoundingClientRect().top < vh) return;
      const d = (i % 5) * 90;
      n.style.opacity = '0';
      n.style.transform = 'translateY(26px) scale(.97)';
      n.style.transition = `opacity .9s ease ${d}ms, transform 1s cubic-bezier(.2,.7,.2,1) ${d}ms`;
      io.observe(n);
    });
    return () => io.disconnect();
  }, [root, ready, disabled]);
}

/** Leve efeito de profundidade nas fotos marcadas com data-parallax. */
export function useParallax(root: RefObject<HTMLElement | null>, ready: boolean, disabled: boolean): void {
  useEffect(() => {
    const el = root.current;
    if (!ready || disabled || !el) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const vh = window.innerHeight;
      el.querySelectorAll<HTMLElement>('[data-parallax]').forEach((n) => {
        const r = n.parentElement!.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const c = Math.max(-1.2, Math.min(1.2, (r.top + r.height / 2 - vh / 2) / vh));
        const k = parseFloat(n.dataset.parallax ?? '') || 0.06;
        n.style.transform = `translate3d(0,${(-c * k * 100).toFixed(2)}%,0)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [root, ready, disabled]);
}

/** Seção visível (destaque no menu), cabeçalho compacto após a capa e proximidade do contato. */
export function useScrollState(root: RefObject<HTMLElement | null>, ready: boolean) {
  const [active, setActive] = useState<SectionId>('inicio');
  const [scrolled, setScrolled] = useState(false);
  const [nearContact, setNearContact] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!ready || !el) return;
    const onScroll = () => {
      const hero = el.querySelector('[data-sec="inicio"]');
      if (hero) setScrolled(hero.getBoundingClientRect().bottom < 90);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    let spy: IntersectionObserver | undefined;
    let near: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      spy = new IntersectionObserver(
        (entries) =>
          entries.forEach((en) => {
            const k = en.target.getAttribute('data-sec') as SectionId;
            if (en.isIntersecting && SECTIONS.includes(k)) setActive(k);
          }),
        { rootMargin: '-45% 0px -50% 0px' },
      );
      el.querySelectorAll('[data-sec]').forEach((n) => spy!.observe(n));
      const visible = new Set<Element>();
      near = new IntersectionObserver((entries) => {
        entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
        setNearContact(visible.size > 0);
      });
      el.querySelectorAll('[data-fab-hide]').forEach((n) => near!.observe(n));
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      spy?.disconnect();
      near?.disconnect();
    };
  }, [root, ready]);

  return { active, scrolled, nearContact };
}

/** Rolagem suave até a seção, descontando a altura do cabeçalho fixo. */
export function scrollToSection(id: SectionId, smooth = true): void {
  const behavior: ScrollBehavior = smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto';
  if (id === 'inicio') {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  const target = document.querySelector(`[data-sec="${id}"]`);
  if (!target) return;
  const header = document.querySelector<HTMLElement>('[data-header]');
  const off = (header?.offsetHeight ?? 0) + (id === 'contato' ? 20 : -1);
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - off, behavior });
}
