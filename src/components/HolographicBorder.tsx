import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HolographicBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 80,
} as const;

// Iridescent rainbow — blue → cyan → green → pink → purple → blue.
const HOLO_GRADIENT =
  'conic-gradient(from 0deg, #4f7cff, #22d3ee, #34d399, #f472b6, #a855f7, #4f7cff)';

// Faint white shimmer arc for the counter-rotating layer.
const HOLO_SHIMMER =
  'conic-gradient(from 0deg, transparent 0deg, transparent 150deg, rgba(255,255,255,0.55) 180deg, rgba(255,255,255,0.55) 205deg, transparent 235deg, transparent 360deg)';

const HolographicBorder = memo(({ children, size = 'sm', className }: HolographicBorderProps) => {
  const baseDims = sizeMap[size];

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: baseDims, height: baseDims, overflow: 'visible' }}
    >
      {/* Iridescent ring, rotating. Soft cool-blue outer glow via box-shadow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-11%] rounded-full avatar-frame-ring"
        style={{
          background: HOLO_GRADIENT,
          boxShadow: '0 0 12px 2px rgba(90,140,255,0.35), 0 0 22px 4px rgba(140,110,255,0.22)',
          ['--frame-speed' as string]: '6s',
          zIndex: 0,
        }}
      />

      {/* Subtle counter-rotating white shimmer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-11%] rounded-full avatar-frame-ring-reverse mix-blend-overlay opacity-70"
        style={{
          background: HOLO_SHIMMER,
          ['--frame-speed' as string]: '9s',
          zIndex: 1,
        }}
      />

      {/* Avatar — covers ring center */}
      <div
        className="relative z-[2] h-full w-full overflow-hidden rounded-full"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.5)' }}
      >
        {children}
      </div>
    </div>
  );
});

HolographicBorder.displayName = 'HolographicBorder';
export default HolographicBorder;
