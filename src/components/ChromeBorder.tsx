import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChromeBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

// Polished-metal conic gradient — alternating silver stops repeat around the circle.
const CHROME_GRADIENT =
  'conic-gradient(from 0deg, #e8eaf0, #9aa0ad, #f5f7fa, #7d8493, #e8eaf0, #9aa0ad, #f5f7fa, #7d8493, #e8eaf0)';

// Thin bright specular glint arc that sweeps around.
const CHROME_GLINT =
  'conic-gradient(from 0deg, transparent 0deg, transparent 165deg, rgba(255,255,255,0.95) 180deg, rgba(255,255,255,0.6) 190deg, transparent 205deg, transparent 360deg)';

const ChromeBorder = memo(({ children, size = 'sm', className }: ChromeBorderProps) => {
  return (
    <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
      {/* Brushed-silver conic ring — very slow rotation. Outer dark hairline via box-shadow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring"
        style={{
          background: CHROME_GRADIENT,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.28), 0 2px 6px -1px rgba(60,70,90,0.25)',
          ['--frame-speed' as string]: '14s',
          zIndex: 0,
        }}
      />

      {/* Bright specular glint arc sweeping around, slightly blurred. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring"
        style={{
          background: CHROME_GLINT,
          filter: 'blur(1.2px)',
          ['--frame-speed' as string]: '3.5s',
          zIndex: 1,
          mixBlendMode: 'screen',
        }}
      />

      {/* Avatar sits inset inward by the ring thickness. Inner white hairline sells the bevel. */}
      <div
        className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[2]"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.75)' }}
      >
        {children}
      </div>
    </div>
  );
});

ChromeBorder.displayName = 'ChromeBorder';
export default ChromeBorder;
