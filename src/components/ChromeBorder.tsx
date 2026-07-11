import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChromeBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Preview/grid mode — drop the counter-rotating specular sweep. */
  preview?: boolean;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

// Brushed-silver conic — many alternating value stops so highlights read as
// individual bevel bands rather than one smooth band.
const CHROME_BEVEL =
  'conic-gradient(from 0deg,' +
  '#f5f7fa, #b6bcc9, #e8eaf0, #8a91a1, #dfe2ea, #a2a8b7, #f5f7fa,' +
  '#7d8493, #d5d9e2, #9aa0ad, #eef0f5, #858c9b, #f5f7fa)';

// Two independent specular sweep arcs — different widths & start angles so
// they rarely align and highlights appear to travel non-uniformly.
const CHROME_SWEEP_A =
  'conic-gradient(from 0deg, transparent 0deg, transparent 155deg, rgba(255,255,255,0.95) 178deg, rgba(255,255,255,0.55) 195deg, transparent 220deg, transparent 360deg)';
const CHROME_SWEEP_B =
  'conic-gradient(from 90deg, transparent 0deg, transparent 168deg, rgba(255,255,255,0.75) 185deg, rgba(255,255,255,0.4) 200deg, transparent 218deg, transparent 360deg)';

const ChromeBorder = memo(({ children, size = 'sm', className, preview }: ChromeBorderProps) => {
  return (
    <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
      {/* Base brushed bevel — rotates slowly so bevel bands drift around. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring"
        style={{
          background: CHROME_BEVEL,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.32), 0 2px 6px -1px rgba(60,70,90,0.28)',
          ['--frame-speed' as string]: '18s',
          zIndex: 0,
        }}
      />

      {/* Slow "morph" layer — same bevel, opposite direction, slightly scaled
          & translated. Where the two overlap, highlight positions drift and
          appear non-uniform instead of a single rigid rotation. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-4%] rounded-full avatar-frame-ring-reverse chrome-morph"
        style={{
          background: CHROME_BEVEL,
          mixBlendMode: 'overlay',
          opacity: 0.85,
          ['--frame-speed' as string]: '11s',
          zIndex: 1,
        }}
      />

      {/* Primary bright specular sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring"
        style={{
          background: CHROME_SWEEP_A,
          filter: 'blur(1.1px)',
          mixBlendMode: 'screen',
          ['--frame-speed' as string]: '3.2s',
          zIndex: 2,
        }}
      />

      {/* Counter-rotating dimmer secondary sweep — dropped in preview mode */}
      {!preview && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring-reverse"
          style={{
            background: CHROME_SWEEP_B,
            filter: 'blur(0.8px)',
            mixBlendMode: 'screen',
            opacity: 0.8,
            ['--frame-speed' as string]: '5.4s',
            zIndex: 2,
          }}
        />
      )}

      {/* Avatar inset inward — inner white hairline sells the bevel. */}
      <div
        className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[3]"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.78)' }}
      >
        {children}
      </div>
    </div>
  );
});

ChromeBorder.displayName = 'ChromeBorder';
export default ChromeBorder;
