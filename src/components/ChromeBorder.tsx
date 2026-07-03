import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChromeBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 80,
} as const;

// Polished-metal conic gradient — alternating silver stops repeat around the circle.
const CHROME_GRADIENT =
  'conic-gradient(from 0deg, #e8eaf0, #9aa0ad, #f5f7fa, #7d8493, #e8eaf0, #9aa0ad, #f5f7fa, #7d8493, #e8eaf0)';

const ChromeBorder = memo(({ children, size = 'sm', className }: ChromeBorderProps) => {
  const baseDims = sizeMap[size];

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: baseDims, height: baseDims, overflow: 'visible' }}
    >
      {/* Chrome ring — rotates slowly. Outer dark hairline via box-shadow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-11%] rounded-full avatar-frame-ring"
        style={{
          background: CHROME_GRADIENT,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.28), 0 2px 6px -1px rgba(60,70,90,0.25)',
          ['--frame-speed' as string]: '8s',
          zIndex: 0,
        }}
      />

      {/* Avatar — covers ring center; inner white hairline sells the bevel. */}
      <div
        className="relative z-[1] h-full w-full overflow-hidden rounded-full"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.75)' }}
      >
        {children}
      </div>
    </div>
  );
});

ChromeBorder.displayName = 'ChromeBorder';
export default ChromeBorder;
