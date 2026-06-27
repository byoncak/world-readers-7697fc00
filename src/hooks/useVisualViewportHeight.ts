import { useEffect, useRef, useState } from 'react';

const getViewportHeight = () => {
  if (typeof window === 'undefined') return 0;
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
};

const isEditableElement = (element: Element | null) =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLElement && element.isContentEditable);

export const useVisualViewportHeight = () => {
  const [height, setHeight] = useState(getViewportHeight);
  const previousHeightRef = useRef(height);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    const updateHeight = () => {
      setHeight(getViewportHeight());
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    viewport?.addEventListener('resize', updateHeight);
    viewport?.addEventListener('scroll', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      viewport?.removeEventListener('resize', updateHeight);
      viewport?.removeEventListener('scroll', updateHeight);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const previousHeight = previousHeightRef.current;
    const keyboardClosed = height > previousHeight + 80;

    if (keyboardClosed && !isEditableElement(document.activeElement)) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        });
      });
    }

    previousHeightRef.current = height;
  }, [height]);

  return height;
};
