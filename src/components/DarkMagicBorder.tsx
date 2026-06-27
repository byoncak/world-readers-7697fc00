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

const DarkMagicBorder = forwardRef<HTMLDivElement, DarkMagicBorderProps>(
  ({ children, size = 'sm', className }, ref) => {
    return (
      <div ref={ref} className={cn('dark-magic-wrapper shrink-0', sizeClasses[size], className)}>
        <div className="dark-magic-ring">
          <div className={cn('dark-magic-content absolute rounded-full bg-muted overflow-hidden z-[5]', contentInsetClasses[size])}>
            {children}
          </div>
        </div>
      </div>
    );
  }
);

DarkMagicBorder.displayName = 'DarkMagicBorder';
export default DarkMagicBorder;
