import { ReactNode } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

/**
 * Shared loading / error / empty state blocks so widgets don't render
 * blank space, raw error strings, or bare spinners. Match the cozy voice.
 */

interface LoadingBlockProps {
  label?: string;
  rows?: number;
  className?: string;
}

export const LoadingBlock = ({ label = 'Loading…', rows = 3, className = '' }: LoadingBlockProps) => (
  <div className={`space-y-2 ${className}`} role="status" aria-live="polite" aria-label={label}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-8 w-full rounded-lg bg-muted/40 animate-pulse"
        style={{ animationDelay: `${i * 80}ms` }}
      />
    ))}
    <span className="sr-only">{label}</span>
  </div>
);

interface ErrorBlockProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBlock = ({
  message = "Something went sideways loading this. Give it another try?",
  onRetry,
  className = '',
}: ErrorBlockProps) => (
  <div
    className={`flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-center ${className}`}
    role="alert"
  >
    <p className="text-sm text-muted-foreground font-body">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground border border-border/60 shadow-sm hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        Try again
      </button>
    )}
  </div>
);

interface EmptyBlockProps {
  message: string;
  icon?: ReactNode;
  className?: string;
}

export const EmptyBlock = ({ message, icon, className = '' }: EmptyBlockProps) => (
  <div className={`flex flex-col items-center gap-2 py-6 text-center ${className}`}>
    <span className="text-muted-foreground/60" aria-hidden="true">
      {icon ?? <Sparkles className="h-5 w-5" />}
    </span>
    <p className="text-sm text-muted-foreground font-body">{message}</p>
  </div>
);
