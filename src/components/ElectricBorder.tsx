import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ElectricBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Variant key — controls the two-color glow palette */
  variantKey?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
} as const;

// Two-tone palettes per variant: [base ring, animated arc]
const VARIANT_COLORS: Record<string, { base: string; spark: string }> = {
  ember:     { base: '#ff6600', spark: '#ffcc00' },
  voltage:   { base: '#3b82f6', spark: '#22d3ee' },
  toxic:     { base: '#32cd32', spark: '#adff2f' },
  shockwave: { base: '#ff1493', spark: '#ff69b4' },
  arcane:    { base: '#6a1bbd', spark: '#c8a2ff' },
};

const ElectricBorder = memo(({ children, size = 'sm', className, variantKey }: ElectricBorderProps) => {
  const palette = VARIANT_COLORS[variantKey || ''] || VARIANT_COLORS.ember;

  // Bright ~70° spark arc in spark color, transparent elsewhere.
  const sparkGradient = `conic-gradient(from 0deg, transparent 0deg, transparent 145deg, ${palette.spark} 180deg, ${palette.spark} 215deg, transparent 250deg, transparent 360deg)`;
  // Dimmer, narrower counter-rotating arc — offset so the two arcs rarely align.
  const counterGradient = `conic-gradient(from 45deg, transparent 0deg, transparent 155deg, ${palette.spark}99 180deg, ${palette.spark}77 205deg, transparent 230deg, transparent 360deg)`;

  return (
    <div className={cn('relative shrink-0 rounded-full', sizeClasses[size], className)}>
      {/* Static base ring in the base color, with a stuttering electrical flicker on the glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full electric-flicker"
        style={{
          background: palette.base,
          boxShadow: `0 0 8px 1px ${palette.base}80, 0 0 16px 2px ${palette.base}55`,
          zIndex: 0,
        }}
      />

      {/* Fast bright spark arc */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring"
        style={{
          background: sparkGradient,
          filter: `drop-shadow(0 0 4px ${palette.spark})`,
          ['--frame-speed' as string]: '1.4s',
          zIndex: 1,
        }}
      />

      {/* Dimmer counter-rotating arc for chaotic feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full avatar-frame-ring-reverse"
        style={{
          background: counterGradient,
          filter: `drop-shadow(0 0 3px ${palette.spark})`,
          ['--frame-speed' as string]: '2.3s',
          zIndex: 1,
          opacity: 0.7,
        }}
      />

      {/* Avatar inset inward so ring reads as a band, not a growth. */}
      <div className="absolute inset-[9%] rounded-full overflow-hidden bg-muted z-[2]">
        {children}
      </div>
    </div>
  );
});

ElectricBorder.displayName = 'ElectricBorder';
export default ElectricBorder;
