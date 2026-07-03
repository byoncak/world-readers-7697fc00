import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ElectricBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Variant key — controls the two-color glow palette */
  variantKey?: string;
}

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 80,
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
  const baseDims = sizeMap[size];
  const palette = VARIANT_COLORS[variantKey || ''] || VARIANT_COLORS.ember;

  // Bright ~70° arc in spark color, transparent elsewhere.
  const sparkGradient = `conic-gradient(from 0deg, transparent 0deg, transparent 145deg, ${palette.spark} 180deg, ${palette.spark} 215deg, transparent 250deg, transparent 360deg)`;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: baseDims, height: baseDims, overflow: 'visible' }}
    >
      {/* Static base ring + glow (behind everything) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-10%] rounded-full"
        style={{
          background: palette.base,
          boxShadow: `0 0 10px 1px ${palette.base}80, 0 0 18px 2px ${palette.base}55`,
          zIndex: 0,
        }}
      />

      {/* Rotating spark arc */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-14%] rounded-full avatar-frame-ring"
        style={{
          background: sparkGradient,
          filter: `drop-shadow(0 0 4px ${palette.spark})`,
          ['--frame-speed' as string]: '1.6s',
          zIndex: 1,
        }}
      />

      {/* Avatar — covers ring center, showing only the outer donut band */}
      <div className="relative z-[2] h-full w-full overflow-hidden rounded-full">{children}</div>
    </div>
  );
});

ElectricBorder.displayName = 'ElectricBorder';
export default ElectricBorder;
