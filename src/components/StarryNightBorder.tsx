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

// Hand-authored irregular constellation. Angles are intentionally NOT evenly
// spaced, radii wobble between 43–48 so stars sit at varied depths in the
// band, sizes/kinds mix, and each star gets an incommensurate twinkle period
// (2.1–4.7s) plus a distinct delay so the group never visibly loops.
const PRIMARY_STARS: StarSpec[] = [
  { ...pt(-78, 47), r: 3.6, kind: 'g', delay: 0.0, duration: 2.7 },
  { ...pt(-22, 45), r: 2.4, kind: 'd', delay: 0.9, duration: 3.3 },
  { ...pt(34, 48), r: 3.0, kind: 'g', delay: 0.4, duration: 2.1 },
  { ...pt(96, 46), r: 3.2, kind: 'g', delay: 1.7, duration: 3.9 },
  { ...pt(156, 44), r: 2.6, kind: 'd', delay: 0.6, duration: 2.9 },
  { ...pt(202, 47), r: 3.4, kind: 'g', delay: 1.2, duration: 4.7 },
  { ...pt(268, 45), r: 2.8, kind: 'd', delay: 2.1, duration: 3.1 },
].map((s) => ({ cx: s.x, cy: s.y, r: s.r, kind: s.kind as 'g' | 'd', delay: s.delay, duration: s.duration }));

const SECONDARY_STARS: StarSpec[] = [
  { ...pt(-45, 43), r: 1.5, kind: 'd', delay: 0.3, duration: 4.1 },
  { ...pt(12, 48), r: 1.7, kind: 'd', delay: 1.3, duration: 3.7 },
  { ...pt(72, 44), r: 1.4, kind: 'd', delay: 0.7, duration: 2.5 },
  { ...pt(128, 48), r: 1.6, kind: 'g', delay: 1.9, duration: 4.3 },
  { ...pt(178, 43), r: 1.8, kind: 'd', delay: 0.2, duration: 3.5 },
  { ...pt(238, 45), r: 1.5, kind: 'g', delay: 1.5, duration: 2.7 },
  { ...pt(312, 48), r: 1.7, kind: 'd', delay: 0.8, duration: 4.9 },
  { ...pt(342, 44), r: 1.4, kind: 'd', delay: 2.3, duration: 3.1 },
].map((s) => ({ cx: s.x, cy: s.y, r: s.r, kind: s.kind as 'g' | 'd', delay: s.delay, duration: s.duration }));

const SPECKLES: Array<{ cx: number; cy: number; r: number }> = [
  { ...pt(-105, 41), r: 0.7 },
  { ...pt(-12, 40), r: 0.6 },
  { ...pt(58, 42), r: 0.5 },
  { ...pt(122, 41), r: 0.7 },
  { ...pt(195, 40), r: 0.5 },
  { ...pt(290, 42), r: 0.6 },
].map((s) => ({ cx: s.x, cy: s.y, r: s.r }));

const GlintPath = ({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) => (
  <g transform={`translate(${cx} ${cy})`}>
    <ellipse rx={r} ry={r * 0.28} fill={fill} />
    <ellipse rx={r * 0.28} ry={r} fill={fill} />
  </g>
);

const StarryNightBorder = memo(
  ({ children, size = 'sm', className, variantKey, preview }: StarryNightBorderProps) => {
    const palette = VARIANT_PALETTES[variantKey || 'indigo'] || VARIANT_PALETTES.indigo;

    // At sm show fewer but slightly larger, higher-contrast stars.
    // Curate the constellation per size instead of just dropping secondary.
    const primary = size === 'sm' ? PRIMARY_STARS.slice(0, 4) : PRIMARY_STARS;
    const showSecondary = size === 'lg' || (size === 'md' && !preview);
    const showSpeckle = size !== 'sm';

    // Boost star sizes at small avatar sizes so they're readable rather than tiny dots.
    const sizeBoost = size === 'sm' ? 1.35 : size === 'md' ? 1.1 : 1;

    const filterId = useMemo(
      () => `starry-glow-${(variantKey || 'indigo').replace(/[^a-z0-9]/gi, '')}`,
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
