import { memo, useMemo, type ReactNode } from 'react';
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
  star: string;
  glint: string;
  speckle: string;
};

const VARIANT_PALETTES: Record<string, Palette> = {
  indigo: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #4338ca 0%, #1e1b4b 55%, #0b0a26 100%)',
    glow: 'rgba(129,140,248,0.55)',
    star: '#e0e7ff',
    glint: '#c7d2fe',
    speckle: 'rgba(224,231,255,0.6)',
  },
  rose: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #be185d 0%, #4c0519 55%, #1a0210 100%)',
    glow: 'rgba(251,113,133,0.55)',
    star: '#ffe4e6',
    glint: '#fda4af',
    speckle: 'rgba(255,228,230,0.6)',
  },
  emerald: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #047857 0%, #052e2b 55%, #011512 100%)',
    glow: 'rgba(52,211,153,0.55)',
    star: '#d1fae5',
    glint: '#6ee7b7',
    speckle: 'rgba(209,250,229,0.6)',
  },
  gold: {
    ringBg:
      'radial-gradient(circle at 30% 25%, #b45309 0%, #3f2405 55%, #170e02 100%)',
    glow: 'rgba(251,191,36,0.6)',
    star: '#fef3c7',
    glint: '#fde68a',
    speckle: 'rgba(254,243,199,0.65)',
  },
};

// Star positions along a perimeter ring (normalized 0..100 coords), with mixed
// types: g = 4-point glint, d = small round dot. Distributed unevenly so the
// ring never looks periodic and there's no visible seam at 12 o'clock.
type StarSpec = { cx: number; cy: number; r: number; kind: 'g' | 'd'; delay: number };

// Compute polar → cartesian around center (50,50) at given radius.
const pt = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 50 + Math.cos(rad) * radius, y: 50 + Math.sin(rad) * radius };
};

const RING_R = 46; // just outside the avatar (which is inset ~9% → radius ~41)

// Primary (always visible) — a handful, staggered.
const makeStar = (
  p: { x: number; y: number },
  r: number,
  kind: 'g' | 'd',
  delay: number,
): StarSpec => ({ cx: p.x, cy: p.y, r, kind, delay });

const PRIMARY_STARS: StarSpec[] = [
  makeStar(pt(-72, RING_R), 3.2, 'g', 0),
  makeStar(pt(18, RING_R), 2.4, 'g', 0.7),
  makeStar(pt(112, RING_R), 2.8, 'g', 1.4),
  makeStar(pt(205, RING_R), 2.2, 'd', 0.3),
  makeStar(pt(258, RING_R), 2.6, 'g', 1.9),
];

// Secondary (only at md/lg or when not preview) — smaller, denser.
const SECONDARY_STARS: StarSpec[] = [
  makeStar(pt(-40, RING_R + 2), 1.3, 'd', 0.9),
  makeStar(pt(48, RING_R - 2), 1.5, 'd', 1.6),
  makeStar(pt(85, RING_R + 3), 1.2, 'd', 0.4),
  makeStar(pt(150, RING_R - 1), 1.4, 'd', 2.1),
  makeStar(pt(180, RING_R + 2), 1.6, 'g', 1.1),
  makeStar(pt(232, RING_R - 3), 1.3, 'd', 0.6),
  makeStar(pt(305, RING_R + 2), 1.5, 'd', 1.7),
  makeStar(pt(340, RING_R - 2), 1.4, 'g', 0.2),
];

// Faint constellation speckle inside the ring band.
const SPECKLES: Array<{ cx: number; cy: number; r: number }> = [
  { ...pt(-100, RING_R - 5), r: 0.7 },
  { ...pt(-15, RING_R - 6), r: 0.6 },
  { ...pt(60, RING_R - 5), r: 0.5 },
  { ...pt(130, RING_R - 6), r: 0.7 },
  { ...pt(220, RING_R - 5), r: 0.5 },
  { ...pt(290, RING_R - 5), r: 0.6 },
].map((s) => ({ cx: s.x, cy: s.y, r: s.r }));

const GlintPath = ({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) => {
  // A 4-point star drawn as two crossed diamonds using two thin ellipses so it
  // reads as a sparkle at any scale without needing many points.
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse rx={r} ry={r * 0.28} fill={fill} />
      <ellipse rx={r * 0.28} ry={r} fill={fill} />
    </g>
  );
};

const StarryNightBorder = memo(
  ({ children, size = 'sm', className, variantKey, preview }: StarryNightBorderProps) => {
    const palette = VARIANT_PALETTES[variantKey || 'indigo'] || VARIANT_PALETTES.indigo;

    // At sm keep primary only; add secondary at md/lg (and when not preview at md).
    const showSecondary = size === 'lg' || (size === 'md' && !preview);
    const showSpeckle = size !== 'sm';

    // Filter id must be unique per palette to prevent cross-instance bleed.
    const filterId = useMemo(
      () => `starry-glow-${(variantKey || 'indigo').replace(/[^a-z0-9]/gi, '')}`,
      [variantKey],
    );

    return (
      <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
        {/* Deep midnight ring — the base celestial band. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: palette.ringBg,
            boxShadow: `0 0 10px 1px ${palette.glow}, inset 0 0 6px rgba(255,255,255,0.18)`,
            zIndex: 0,
          }}
        />

        {/* Stars layer. Slowly orbits (skipped in preview & reduced-motion). */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full',
            !preview && 'avatar-frame-ring',
          )}
          style={{ overflow: 'visible', zIndex: 1, ['--frame-speed' as string]: '42s' }}
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" />
            </filter>
          </defs>

          {showSpeckle && (
            <g opacity={0.55}>
              {SPECKLES.map((s, i) => (
                <circle key={`sp-${i}`} cx={s.cx} cy={s.cy} r={s.r} fill={palette.speckle} />
              ))}
            </g>
          )}

          {PRIMARY_STARS.map((s, i) => (
            <g
              key={`p-${i}`}
              className="starry-twinkle"
              style={{ animationDelay: `${s.delay}s`, transformOrigin: `${s.cx}px ${s.cy}px` }}
            >
              {/* Halo */}
              <circle cx={s.cx} cy={s.cy} r={s.r + 1.2} fill={palette.glow} filter={`url(#${filterId})`} opacity={0.9} />
              {s.kind === 'g' ? (
                <GlintPath cx={s.cx} cy={s.cy} r={s.r} fill={palette.star} />
              ) : (
                <circle cx={s.cx} cy={s.cy} r={s.r * 0.7} fill={palette.star} />
              )}
            </g>
          ))}

          {showSecondary &&
            SECONDARY_STARS.map((s, i) => (
              <g
                key={`s-${i}`}
                className="starry-twinkle-soft"
                style={{ animationDelay: `${s.delay}s`, transformOrigin: `${s.cx}px ${s.cy}px` }}
              >
                {s.kind === 'g' ? (
                  <GlintPath cx={s.cx} cy={s.cy} r={s.r} fill={palette.glint} />
                ) : (
                  <circle cx={s.cx} cy={s.cy} r={s.r * 0.7} fill={palette.glint} />
                )}
              </g>
            ))}
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
