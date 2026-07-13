import { memo, useMemo, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StarryNightBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variantKey?: string;
  /** Preview/grid mode — fewer secondary stars & no orbit rotation. */
  preview?: boolean;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

type Palette = {
  ringBg: string;
  glow: string;
  star: string;   // primary star fill
  glint: string;  // secondary/soft star fill
  speckle: string;
};

// Every color is driven from the variant palette — no hardcoded indigo bleed.
// Palettes chosen with strong per-variant hue so rose/emerald/gold read clearly
// rather than all looking purplish.
const VARIANT_PALETTES: Record<string, Palette> = {
  indigo: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #4338ca 0%, #1e1b4b 55%, #0b0a26 100%)',
    glow: 'rgba(165,180,252,0.85)',
    star: '#eef2ff',
    glint: '#c7d2fe',
    speckle: 'rgba(224,231,255,0.7)',
  },
  rose: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #be185d 0%, #4c0519 55%, #1a0210 100%)',
    glow: 'rgba(251,113,133,0.9)',
    star: '#fff1f2',
    glint: '#fda4af',
    speckle: 'rgba(255,205,215,0.75)',
  },
  emerald: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #047857 0%, #052e2b 55%, #011512 100%)',
    glow: 'rgba(52,211,153,0.9)',
    star: '#ecfdf5',
    glint: '#6ee7b7',
    speckle: 'rgba(167,243,208,0.75)',
  },
  gold: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #b45309 0%, #3f2405 55%, #170e02 100%)',
    glow: 'rgba(251,191,36,0.95)',
    star: '#fffbeb',
    glint: '#fcd34d',
    speckle: 'rgba(253,224,71,0.8)',
  },
};

type StarSpec = {
  cx: number;
  cy: number;
  r: number;
  kind: 'g' | 'd';
  delay: number;
  /** Incommensurate per-star duration so the constellation never resyncs. */
  duration: number;
};

// Compute polar → cartesian around center (50,50) at given radius.
const pt = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 50 + Math.cos(rad) * radius, y: 50 + Math.sin(rad) * radius };
};

const GlintPath = ({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) => (
  <g transform={`translate(${cx} ${cy})`}>
    <ellipse rx={r} ry={r * 0.28} fill={fill} />
    <ellipse rx={r * 0.28} ry={r} fill={fill} />
  </g>
);

// Tiny mulberry32 seeded PRNG — deterministic per instance, no repeats.
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A running per-mount counter guarantees separately-mounted instances differ
// even without a stable seed prop.
let mountCounter = 1;

const generateConstellation = (
  seed: number,
  { primaryCount, secondaryCount, speckleCount }: { primaryCount: number; secondaryCount: number; speckleCount: number },
) => {
  const rng = makeRng(seed);
  const between = (a: number, b: number) => a + rng() * (b - a);

  // Distribute stars around the band with jittered sectors so no perfect ring
  // yet no clumping either.
  const sample = (count: number, rMin: number, rMax: number, sizeMin: number, sizeMax: number) => {
    const items: StarSpec[] = [];
    for (let i = 0; i < count; i++) {
      const sectorCenter = (360 / count) * i;
      const angle = sectorCenter + between(-360 / count / 2 + 4, 360 / count / 2 - 4);
      const radius = between(rMin, rMax);
      const rad = (angle * Math.PI) / 180;
      items.push({
        cx: 50 + Math.cos(rad) * radius,
        cy: 50 + Math.sin(rad) * radius,
        r: between(sizeMin, sizeMax),
        kind: rng() < 0.55 ? 'g' : 'd',
        delay: between(0, 2.4),
        // Incommensurate irrational-ish durations so the group never resyncs.
        duration: between(2.3, 4.9),
      });
    }
    return items;
  };

  const primary = sample(primaryCount, 43, 48, 2.2, 3.7);
  const secondary = sample(secondaryCount, 42, 48, 1.3, 1.9);
  const speckles: Array<{ cx: number; cy: number; r: number }> = [];
  for (let i = 0; i < speckleCount; i++) {
    const angle = (360 / speckleCount) * i + between(-14, 14);
    const radius = between(40, 42);
    const rad = (angle * Math.PI) / 180;
    speckles.push({
      cx: 50 + Math.cos(rad) * radius,
      cy: 50 + Math.sin(rad) * radius,
      r: between(0.45, 0.8),
    });
  }
  return { primary, secondary, speckles };
};

const StarryNightBorder = memo(
  ({ children, size = 'sm', className, variantKey, preview }: StarryNightBorderProps) => {
    const palette = VARIANT_PALETTES[variantKey || 'indigo'] || VARIANT_PALETTES.indigo;

    // Per-mount stable seed. Combined with variantKey + size so equipping a
    // different variant re-derives the layout, but rerenders don't.
    const seedRef = useRef<number>(0);
    if (seedRef.current === 0) {
      seedRef.current = (mountCounter++ * 2654435761) >>> 0;
    }

    // Fewer, bolder stars at small sizes so silhouette reads.
    const counts =
      size === 'sm'
        ? { primaryCount: 4, secondaryCount: 0, speckleCount: 0 }
        : size === 'md'
        ? { primaryCount: 6, secondaryCount: preview ? 0 : 5, speckleCount: preview ? 0 : 4 }
        : { primaryCount: 7, secondaryCount: preview ? 0 : 8, speckleCount: preview ? 0 : 6 };

    const { primary, secondary, speckles } = useMemo(
      () => generateConstellation(seedRef.current ^ (variantKey?.length ?? 0) ^ (size.charCodeAt(0) << 8), counts),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [variantKey, size, preview],
    );

    const sizeBoost = size === 'sm' ? 1.5 : size === 'md' ? 1.15 : 1;

    const filterId = useMemo(
      () => `starry-glow-${(variantKey || 'indigo').replace(/[^a-z0-9]/gi, '')}-${seedRef.current.toString(36).slice(-4)}`,
      [variantKey],
    );

    return (
      <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
        {/* Deep celestial ring — the base band, tinted per variant. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: palette.ringBg,
            boxShadow: `0 0 10px 1px ${palette.glow}, inset 0 0 6px rgba(255,255,255,0.18)`,
            zIndex: 0,
          }}
        />

        {/* Stars layer — no collective rotation (removed the periodic-looking
            orbit), each star twinkles on its own incommensurate schedule. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: 'visible', zIndex: 1 }}
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" />
            </filter>
          </defs>

          {showSpeckle && (
            <g opacity={0.6}>
              {SPECKLES.map((s, i) => (
                <circle key={`sp-${i}`} cx={s.cx} cy={s.cy} r={s.r} fill={palette.speckle} />
              ))}
            </g>
          )}

          {primary.map((s, i) => {
            const rr = s.r * sizeBoost;
            return (
              <g
                key={`p-${i}`}
                className="starry-twinkle"
                style={{
                  animationDelay: `${s.delay}s`,
                  animationDuration: `${s.duration}s`,
                  transformOrigin: `${s.cx}px ${s.cy}px`,
                }}
              >
                <circle cx={s.cx} cy={s.cy} r={rr + 1.2} fill={palette.glow} filter={`url(#${filterId})`} opacity={0.9} />
                {s.kind === 'g' ? (
                  <GlintPath cx={s.cx} cy={s.cy} r={rr} fill={palette.star} />
                ) : (
                  <circle cx={s.cx} cy={s.cy} r={rr * 0.7} fill={palette.star} />
                )}
              </g>
            );
          })}

          {showSecondary &&
            !preview &&
            SECONDARY_STARS.map((s, i) => {
              const rr = s.r * sizeBoost;
              return (
                <g
                  key={`s-${i}`}
                  className="starry-twinkle-soft"
                  style={{
                    animationDelay: `${s.delay}s`,
                    animationDuration: `${s.duration}s`,
                    transformOrigin: `${s.cx}px ${s.cy}px`,
                  }}
                >
                  {s.kind === 'g' ? (
                    <GlintPath cx={s.cx} cy={s.cy} r={rr} fill={palette.glint} />
                  ) : (
                    <circle cx={s.cx} cy={s.cy} r={rr * 0.7} fill={palette.glint} />
                  )}
                </g>
              );
            })}
        </svg>

        {/* Avatar inset — inner hairline sells the ring. */}
        <div
          className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[2]"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.35), inset 0 0 6px rgba(0,0,0,0.35)` }}
        >
          {children}
        </div>
      </div>
    );
  },
);

StarryNightBorder.displayName = 'StarryNightBorder';
export default StarryNightBorder;
