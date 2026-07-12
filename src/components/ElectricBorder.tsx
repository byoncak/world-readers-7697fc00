import { memo, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ElectricBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variantKey?: string;
  /** Preview/grid mode: drop secondary wisp & fast spark. */
  preview?: boolean;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

const VARIANT_COLORS: Record<string, { base: string; spark: string }> = {
  ember: { base: '#ff6600', spark: '#ffcc00' },
  voltage: { base: '#3b82f6', spark: '#22d3ee' },
  toxic: { base: '#32cd32', spark: '#adff2f' },
  shockwave: { base: '#ff1493', spark: '#ff69b4' },
  arcane: { base: '#6a1bbd', spark: '#c8a2ff' },
};

// Perimeter of the r=48 circle in SVG coords (viewBox 0..100). We chop it into
// SEPARATED bright arcs (not a spiky polygon crown) using stroke-dasharray so
// electricity reads as several disconnected discharges wrapping the avatar.
const CIRC = 2 * Math.PI * 48;

// Short outward branches — a few asymmetric bolts that stick out at fixed
// angles. Kept small so they never crop the viewBox.
type Branch = { a: number; length: number; kink: number };
const BRANCHES: Branch[] = [
  { a: -70, length: 6, kink: 2 },
  { a: 25, length: 5, kink: -1.5 },
  { a: 118, length: 7, kink: 2.5 },
  { a: 210, length: 5, kink: -2 },
  { a: 300, length: 6, kink: 1.5 },
];

const branchPath = (b: Branch) => {
  const r0 = 48;
  const rad = (b.a * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const x0 = 50 + cos * r0;
  const y0 = 50 + sin * r0;
  // midpoint kinked perpendicular to the radial to feel like a bolt.
  const perpX = -sin;
  const perpY = cos;
  const midR = r0 + b.length * 0.55;
  const xm = 50 + cos * midR + perpX * b.kink;
  const ym = 50 + sin * midR + perpY * b.kink;
  const xe = 50 + cos * (r0 + b.length);
  const ye = 50 + sin * (r0 + b.length);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} L${xm.toFixed(2)},${ym.toFixed(2)} L${xe.toFixed(2)},${ye.toFixed(2)}`;
};

const ElectricBorder = memo(
  ({ children, size = 'sm', className, variantKey, preview }: ElectricBorderProps) => {
    const palette = VARIANT_COLORS[variantKey || ''] || VARIANT_COLORS.ember;
    const filterId = useMemo(
      () => `el-glow-${palette.base.replace('#', '')}`,
      [palette.base],
    );

    // Separated bright arcs: three long-ish dashes with sizeable gaps.
    // Sum of on+off segments equals CIRC exactly (rounded).
    const arcSegments = `${CIRC * 0.18} ${CIRC * 0.15} ${CIRC * 0.14} ${CIRC * 0.13} ${CIRC * 0.11} ${CIRC * 0.29}`;

    return (
      <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
        {/* Restrained radial glow with irregular flicker. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[-6%] rounded-full electric-flicker"
          style={{
            background: `radial-gradient(circle, ${palette.base}55 40%, transparent 72%)`,
            zIndex: 0,
          }}
        />

        <svg
          aria-hidden
          viewBox="-8 -8 116 116"
          className="pointer-events-none absolute inset-[-8%] h-[116%] w-[116%]"
          style={{ overflow: 'visible', zIndex: 1 }}
        >
          <defs>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1.1" />
            </filter>
          </defs>

          {/* Stable base energized outline — thin, dim, always visible (no
              rotation) so the ring reads as anchored. */}
          <circle
            cx={50}
            cy={50}
            r={48}
            fill="none"
            stroke={palette.base}
            strokeWidth={1.2}
            opacity={0.55}
          />

          {/* Separated bright arcs — SLOWLY rotates & flickers. Feels like
              disconnected discharges wrapping the perimeter. */}
          <g
            className="avatar-frame-ring electric-flicker origin-center"
            style={{ ['--frame-speed' as string]: '11s', transformOrigin: '50px 50px' }}
          >
            <circle
              cx={50}
              cy={50}
              r={48}
              fill="none"
              stroke={palette.base}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeDasharray={arcSegments}
              filter={`url(#${filterId})`}
              opacity={0.9}
            />
            <circle
              cx={50}
              cy={50}
              r={48}
              fill="none"
              stroke={palette.spark}
              strokeWidth={1.1}
              strokeLinecap="round"
              strokeDasharray={arcSegments}
              opacity={0.95}
            />
          </g>

          {/* Short branches — sit at fixed angles, flicker with the ring. */}
          <g className="electric-flicker" style={{ animationDuration: '1.8s' }}>
            {(size === 'sm' ? BRANCHES.slice(0, 3) : BRANCHES).map((b, i) => (
              <path
                key={i}
                d={branchPath(b)}
                stroke={palette.spark}
                strokeWidth={1.1}
                strokeLinecap="round"
                fill="none"
                opacity={0.85}
                style={{ filter: `drop-shadow(0 0 1.5px ${palette.spark})` }}
              />
            ))}
          </g>

          {/* Fast bright spark racing the perimeter. */}
          {!preview && (
            <g
              className="avatar-frame-ring"
              style={{ ['--frame-speed' as string]: '1.9s', transformOrigin: '50px 50px' }}
            >
              <circle
                cx={50}
                cy={50}
                r={48}
                fill="none"
                stroke={palette.spark}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={`${CIRC * 0.03} ${CIRC * 0.97}`}
                style={{ filter: `drop-shadow(0 0 3px ${palette.spark})` }}
              />
            </g>
          )}

          {/* Faint second outer wisp — only at md/lg and not preview. */}
          {!preview && size !== 'sm' && (
            <g
              className="avatar-frame-ring-reverse"
              style={{ ['--frame-speed' as string]: '4.2s', transformOrigin: '50px 50px' }}
            >
              <circle
                cx={50}
                cy={50}
                r={52}
                fill="none"
                stroke={palette.spark}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeDasharray={`${CIRC * 0.02} ${CIRC * 0.15} ${CIRC * 0.03} ${CIRC * 0.8}`}
                opacity={0.5}
              />
            </g>
          )}
        </svg>

        <div className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[2]">
          {children}
        </div>
      </div>
    );
  },
);

ElectricBorder.displayName = 'ElectricBorder';
export default ElectricBorder;
