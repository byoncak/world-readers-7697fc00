import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HolographicBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

// Iridescent rainbow — blue → cyan → green → pink → purple → blue.
const HOLO_GRADIENT =
  'conic-gradient(from 0deg, #4f7cff, #22d3ee, #34d399, #f472b6, #a855f7, #4f7cff)';

// Faint white shimmer arc for the counter-rotating layer.
const HOLO_SHIMMER =
  'conic-gradient(from 0deg, transparent 0deg, transparent 150deg, rgba(255,255,255,0.55) 180deg, rgba(255,255,255,0.55) 205deg, transparent 235deg, transparent 360deg)';

// Guaranteed-circular outer glow using a radial-gradient on an inset-negative
// rounded-full layer. Replaces the previous box-shadow-based `holo-breathe`,
// which some browsers rendered with visible rectangular filter bounds on
// certain ancestor stacks (e.g. inside dialogs with backdrop filters).
const HOLO_GLOW =
  'radial-gradient(circle, rgba(140,110,255,0.55) 0%, rgba(90,140,255,0.35) 40%, rgba(90,140,255,0) 72%)';

const HolographicBorder = memo(({ children, size = 'sm', className }: HolographicBorderProps) => {
  return (
    <div
      className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}
      style={{ overflow: 'visible', isolation: 'isolate' }}
    >
      {/* Purely circular breathing glow — radial gradient on rounded-full div
          so there is no rectangular filter/box-shadow region. */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full holo-breathe"
        style={{
          inset: '-22%',
          background: HOLO_GLOW,
          zIndex: -1,
        }}
      />

      {/* Iridescent ring rotates AND continuously hue-rotates so colors cycle through the spectrum. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring holo-hue"
        style={{
          background: HOLO_GRADIENT,
          ['--frame-speed' as string]: '6s',
          zIndex: 0,
        }}
      />

      {/* Counter-rotating white shimmer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring-reverse mix-blend-overlay opacity-70"
        style={{
          background: HOLO_SHIMMER,
          ['--frame-speed' as string]: '9s',
          zIndex: 1,
        }}
      />

      {/* Avatar inset inward — the ring shows as a band around it. */}
      <div
        className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[2]"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.5)' }}
      >
        {children}
      </div>
    </div>
  );
});

HolographicBorder.displayName = 'HolographicBorder';
export default HolographicBorder;
