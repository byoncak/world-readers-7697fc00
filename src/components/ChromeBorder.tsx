import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChromeBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Preview/grid mode — drop the second specular sweep to stay cheap. */
  preview?: boolean;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

// Rich alternating brushed-silver conic: many stops so bands read as distinct
// bevel highlights rather than one smooth ring.
const CHROME_FACE =
  'conic-gradient(from 0deg,' +
  '#f6f8fb, #b4bac8, #e6e9ef, #8b91a1, #dfe2ea, #a1a7b6, #f6f8fb,' +
  '#7c8393, #d4d8e1, #99a0ad, #edeff4, #848b9a, #f6f8fb)';

// Single narrow bright specular sweep (used twice with different angles/speeds
// so the highlights travel non-uniformly across the ring).
const CHROME_SWEEP_A =
  'conic-gradient(from 0deg, transparent 0deg, transparent 155deg, rgba(255,255,255,0.95) 178deg, rgba(255,255,255,0.55) 195deg, transparent 220deg, transparent 360deg)';
const CHROME_SWEEP_B =
  'conic-gradient(from 90deg, transparent 0deg, transparent 168deg, rgba(255,255,255,0.75) 185deg, rgba(255,255,255,0.4) 200deg, transparent 218deg, transparent 360deg)';

const ChromeBorder = memo(({ children, size = 'sm', className, preview }: ChromeBorderProps) => {
  return (
    <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
      {/* Dark outer hairline — sells the metal's outer edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: '0 0 0 1px rgba(20,25,35,0.7), 0 2px 8px -1px rgba(50,60,80,0.35)',
          zIndex: 0,
        }}
      />

      {/* Broad metallic face — many alternating silver bands. Slow rotation
          gives brushed-metal drift without rigid feel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[1px] rounded-full avatar-frame-ring"
        style={{
          background: CHROME_FACE,
          ['--frame-speed' as string]: '20s',
          zIndex: 1,
        }}
      />

      {/* Counter-rotating morph layer — same face, opposite direction, slight
          scale breathe. Where the two overlap, highlights appear to LIQUIDLY
          shift around the ring instead of one rigid rotation. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-3%] rounded-full avatar-frame-ring-reverse chrome-morph"
        style={{
          background: CHROME_FACE,
          mixBlendMode: 'overlay',
          opacity: 0.75,
          ['--frame-speed' as string]: '13s',
          zIndex: 2,
        }}
      />

      {/* Primary bright specular sweep — fast enough to catch the eye. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[1px] rounded-full avatar-frame-ring"
        style={{
          background: CHROME_SWEEP_A,
          mixBlendMode: 'screen',
          ['--frame-speed' as string]: '3.4s',
          zIndex: 3,
        }}
      />

      {/* Counter-rotating dimmer secondary sweep — dropped in preview mode. */}
      {!preview && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[1px] rounded-full avatar-frame-ring-reverse"
          style={{
            background: CHROME_SWEEP_B,
            mixBlendMode: 'screen',
            opacity: 0.75,
            ['--frame-speed' as string]: '5.7s',
            zIndex: 3,
          }}
        />
      )}

      {/* Bright inner bevel hairline — sells the bevel transition into the avatar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%] rounded-full"
        style={{
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.9), inset 0 0 3px rgba(255,255,255,0.35)',
          zIndex: 4,
        }}
      />

      {/* Avatar inset inward — ring reads as a proper metallic band. */}
      <div
        className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[5]"
      >
        {children}
      </div>
    </div>
  );
});

ChromeBorder.displayName = 'ChromeBorder';
export default ChromeBorder;
