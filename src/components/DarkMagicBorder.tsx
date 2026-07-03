import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DarkMagicBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-20 w-20',
};

const contentInsetClasses = {
  sm: 'inset-[4px]',
  md: 'inset-[4px]',
  lg: 'inset-[6px]',
};

// 3 orbiting embers at slightly different radii + speeds; one counter-rotates.
const EMBERS = [
  { speed: '3s', top: '3%', reverse: false },
  { speed: '5s', top: '9%', reverse: true },
  { speed: '7s', top: '15%', reverse: false },
] as const;

const DarkMagicBorder = forwardRef<HTMLDivElement, DarkMagicBorderProps>(
  ({ children, size = 'sm', className }, ref) => {
    return (
      <div ref={ref} className={cn('dark-magic-wrapper shrink-0', sizeClasses[size], className)}>
        <div className="dark-magic-ring">
          <div className={cn('dark-magic-content absolute rounded-full bg-muted overflow-hidden z-[5]', contentInsetClasses[size])}>
            {children}
          </div>
          {EMBERS.map((e, i) => (
            <div
              key={i}
              aria-hidden
              className={cn('pointer-events-none absolute inset-0 rounded-full z-[6]', e.reverse ? 'avatar-frame-ring-reverse' : 'avatar-frame-ring')}
              style={{ ['--frame-speed' as string]: e.speed }}
            >
              <span
                className="dark-magic-ember absolute"
                style={{ top: e.top, left: '50%', transform: 'translateX(-50%)' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

DarkMagicBorder.displayName = 'DarkMagicBorder';
export default DarkMagicBorder;
