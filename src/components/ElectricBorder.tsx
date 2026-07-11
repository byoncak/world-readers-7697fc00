import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ElectricBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Variant key — controls the two-color glow palette */
  variantKey?: string;
  /** Preview/grid mode: drop secondary spark & branch flicker so many cards stay cheap. */
  preview?: boolean;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

const VARIANT_COLORS: Record<string, { base: string; spark: string }> = {
  ember:     { base: '#ff6600', spark: '#ffcc00' },
  voltage:   { base: '#3b82f6', spark: '#22d3ee' },
  toxic:     { base: '#32cd32', spark: '#adff2f' },
  shockwave: { base: '#ff1493', spark: '#ff69b4' },
  arcane:    { base: '#6a1bbd', spark: '#c8a2ff' },
};

// Pre-computed irregular polygon around a circle (radii 47..54). Static string
// → no per-instance JS. viewBox 0..100 with overflow visible so spikes protrude.
const JAGGED_PATH =
  'M101.45,50.00 L96.68,58.23 L98.32,67.59 L90.88,73.60 L88.03,81.91 L84.36,90.94 L75.23,93.69 L67.16,97.15 L59.62,104.57 L50.00,100.30 L41.54,97.96 L33.59,95.10 L24.74,93.75 L16.82,89.54 L13.13,80.94 L7.26,74.68 L2.81,67.18 L2.09,58.45 L-0.84,50.00 L0.60,41.29 L1.31,32.28 L7.93,25.71 L13.50,19.37 L15.58,8.98 L26.39,9.11 L32.49,1.88 L41.00,-1.03 L50.00,-0.82 L58.72,0.57 L67.66,1.49 L74.80,7.04 L80.43,13.74 L88.73,17.50 L94.62,24.24 L96.16,33.20 L96.41,41.82 Z';

// Short branches (crackling protrusions) at fixed angles
const BRANCHES: Array<[number, number, number, number]> = [
  [95, 30, 104, 22],
  [12, 20, 3, 12],
  [90, 80, 100, 90],
  [20, 88, 8, 98],
  [50, -1, 50, -8],
  [50, 101, 50, 108],
];

const ElectricBorder = memo(({ children, size = 'sm', className, variantKey, preview }: ElectricBorderProps) => {
  const palette = VARIANT_COLORS[variantKey || ''] || VARIANT_COLORS.ember;

  return (
    <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
      {/* Ambient outer glow — one restrained radial layer, flicker via opacity. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-6%] rounded-full electric-flicker"
        style={{
          background: `radial-gradient(circle, ${palette.base}55 40%, transparent 72%)`,
          zIndex: 0,
        }}
      />

      {/* Irregular energized outline. SVG lives on a slightly enlarged square
          so the spikes at 50,-1 etc. don't clip. */}
      <svg
        aria-hidden
        viewBox="-6 -6 112 112"
        className="pointer-events-none absolute inset-[-6%] h-[112%] w-[112%]"
        style={{ overflow: 'visible', zIndex: 1 }}
      >
        <defs>
          <filter id={`el-glow-${palette.base.replace('#', '')}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        {/* Jagged base — slowly rotates so spikes never sit still, flicker on opacity. */}
        <g className="electric-flicker avatar-frame-ring origin-center" style={{ ['--frame-speed' as string]: '9s', transformOrigin: '50px 50px' }}>
          <path
            d={JAGGED_PATH}
            fill="none"
            stroke={palette.base}
            strokeWidth={2}
            strokeLinejoin="round"
            filter={`url(#el-glow-${palette.base.replace('#', '')})`}
            opacity={0.85}
          />
          <path
            d={JAGGED_PATH}
            fill="none"
            stroke={palette.spark}
            strokeWidth={0.9}
            strokeLinejoin="round"
            opacity={0.9}
          />
          {/* Crackling short branches protruding just outside the ring */}
          {BRANCHES.map((b, i) => (
            <line
              key={i}
              x1={b[0]} y1={b[1]} x2={b[2]} y2={b[3]}
              stroke={palette.spark}
              strokeWidth={1}
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
        </g>

        {/* Fast bright spark racing the perimeter (smooth circle w/ dasharray). */}
        {!preview && (
          <g className="avatar-frame-ring" style={{ ['--frame-speed' as string]: '1.6s', transformOrigin: '50px 50px' }}>
            <circle
              cx={50} cy={50} r={50}
              fill="none"
              stroke={palette.spark}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeDasharray="10 304"
              style={{ filter: `drop-shadow(0 0 3px ${palette.spark})` }}
            />
          </g>
        )}

        {/* Second dimmer counter-rotating dash to add chaos (skipped in preview) */}
        {!preview && (
          <g className="avatar-frame-ring-reverse" style={{ ['--frame-speed' as string]: '2.6s', transformOrigin: '50px 50px' }}>
            <circle
              cx={50} cy={50} r={50}
              fill="none"
              stroke={palette.spark}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeDasharray="4 158 6 146"
              opacity={0.55}
            />
          </g>
        )}
      </svg>

      {/* Avatar sits inset inward so ring reads as a band. */}
      <div className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[2]">
        {children}
      </div>
    </div>
  );
});

ElectricBorder.displayName = 'ElectricBorder';
export default ElectricBorder;
