import { ButtonHTMLAttributes, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const isEditableElement = (element: Element | null) =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLElement && element.isContentEditable);

const keyboardIsOpen = () => {
  if (typeof window === 'undefined') return false;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const inset = Math.max(0, window.innerHeight - viewportHeight);
  return inset > 80 && isEditableElement(document.activeElement);
};

interface MobileFabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  hidden?: boolean;
  children: ReactNode;
}

const MobileFab = ({ label, hidden = false, children, className, title, type = 'button', ...props }: MobileFabProps) => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateKeyboardState = () => setKeyboardOpen(keyboardIsOpen());

    updateKeyboardState();
    window.addEventListener('resize', updateKeyboardState);
    window.addEventListener('focusin', updateKeyboardState);
    window.addEventListener('focusout', updateKeyboardState);
    window.visualViewport?.addEventListener('resize', updateKeyboardState);
    window.visualViewport?.addEventListener('scroll', updateKeyboardState);

    return () => {
      window.removeEventListener('resize', updateKeyboardState);
      window.removeEventListener('focusin', updateKeyboardState);
      window.removeEventListener('focusout', updateKeyboardState);
      window.visualViewport?.removeEventListener('resize', updateKeyboardState);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardState);
    };
  }, []);

  if (hidden || keyboardOpen || typeof document === 'undefined') return null;

  return createPortal(
    <button
      {...props}
      type={type}
      className={cn(
        'mobile-fab h-12 w-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      title={title ?? label}
      aria-label={label}
    >
      {children}
    </button>,
    document.body,
  );
};

export default MobileFab;