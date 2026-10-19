import { memo } from 'react';

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Partículas douradas caindo (capa). Determinísticas para não "pularem" entre renderizações. */
export const Sparkles = memo(function Sparkles({ count, seed }: { count: number; seed: number }) {
  const r = rng(seed);
  const items = Array.from({ length: count }, (_, i) => {
    const size = 2 + r() * 3.5;
    const fall = 18 + r() * 16;
    const sway = 5 + r() * 5;
    const tw = 3 + r() * 4;
    const gold = r() > 0.35;
    const left = (r() * 100).toFixed(1);
    const fallDelay = (-r() * fall).toFixed(1);
    const swayDelay = (-r() * sway).toFixed(1);
    const twDelay = (-r() * tw).toFixed(1);
    return (
      <span
        key={i}
        style={{ position: 'absolute', left: `${left}%`, top: 0, width: 0, height: '100%', animation: `v2Fall ${fall.toFixed(1)}s linear ${fallDelay}s infinite` }}
      >
        <span style={{ position: 'absolute', top: 0, left: 0, display: 'block', animation: `v2Sway ${sway.toFixed(1)}s ease-in-out ${swayDelay}s infinite` }}>
          <span
            style={{
              display: 'block',
              width: size,
              height: size,
              borderRadius: '50%',
              background: gold ? '#E9CF98' : '#FFF8EA',
              boxShadow: `0 0 ${(size * 2).toFixed(1)}px ${(size * 0.6).toFixed(1)}px ${gold ? 'rgba(233,207,152,0.55)' : 'rgba(255,248,234,0.6)'}`,
              animation: `v2Twinkle ${tw.toFixed(1)}s ease-in-out ${twDelay}s infinite`,
            }}
          />
        </span>
      </span>
    );
  });
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {items}
    </div>
  );
});

/** Luzes desfocadas (bloco de contato). */
export const Bokeh = memo(function Bokeh({ count, seed }: { count: number; seed: number }) {
  const r = rng(seed);
  const colors = ['255,226,168', '255,242,220', '236,196,130'];
  const items = Array.from({ length: count }, (_, i) => {
    const size = 16 + r() * 58;
    const dur = 4 + r() * 5;
    const drift = 9 + r() * 8;
    const c = colors[Math.floor(r() * 3)];
    const left = (r() * 100).toFixed(1);
    const top = (r() * 100).toFixed(1);
    const driftDelay = (-r() * drift).toFixed(1);
    const glowDelay = (-r() * dur).toFixed(1);
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          animation: `v2Drift ${drift.toFixed(1)}s ease-in-out ${driftDelay}s infinite alternate`,
        }}
      >
        <span
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${c},0.85) 0%, rgba(${c},0.4) 42%, rgba(${c},0) 70%)`,
            animation: `v2Glow ${dur.toFixed(1)}s ease-in-out ${glowDelay}s infinite`,
          }}
        />
      </span>
    );
  });
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {items}
    </div>
  );
});
