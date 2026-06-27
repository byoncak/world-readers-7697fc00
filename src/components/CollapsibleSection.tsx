import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  badge?: string | number | null;
  children: ReactNode;
  className?: string;
  open?: boolean;
  onToggle?: () => void;
  hideChevron?: boolean;
  chevronInline?: boolean;
}

const CollapsibleSection = ({ icon, title, defaultOpen = false, badge, children, className = '', open: controlledOpen, onToggle, hideChevron, chevronInline }: CollapsibleSectionProps) => {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;
  const toggle = () => {
    if (onToggle) onToggle();
    if (!isControlled) setInternalOpen(o => !o);
  };
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      const h = contentRef.current.scrollHeight;
      setHeight(h);
      const timer = setTimeout(() => setHeight(undefined), 250);
      return () => clearTimeout(timer);
    } else {
      const h = contentRef.current.scrollHeight;
      setHeight(h);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  const chevron = <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-250 ${open ? 'rotate-180' : ''}`} />;

  return (
    <div className={`cozy-card ${className}`}>
      <button onClick={toggle} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="cozy-title text-xl">{title}</h3>
          {badge != null && <span className="text-xs text-muted-foreground font-body">({badge})</span>}
          {chevronInline && chevron}
        </div>
        {!hideChevron && !chevronInline && chevron}
      </button>
      <div
        ref={contentRef}
        style={{ height: height !== undefined ? `${height}px` : 'auto' }}
        className="overflow-hidden transition-[height] duration-250 ease-in-out"
      >
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
