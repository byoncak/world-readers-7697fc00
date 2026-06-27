import { useEffect } from 'react';

/**
 * Tracks the on-screen keyboard inset and exposes it as CSS custom properties
 * on <html>:
 *   --kb-inset: pixel height of the on-screen keyboard (0 when closed)
 *   --app-vh:   visualViewport.height in px (use instead of 100dvh when you
 *               need to shrink with the keyboard on Android Chrome)
 *
 * Mount once at the app root.
 */
export const useKeyboardInset = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const root = document.documentElement;

    const update = () => {
      const vh = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const inset = Math.max(0, Math.round(window.innerHeight - vh));
      root.style.setProperty('--app-vh', `${Math.round(vh)}px`);
      root.style.setProperty('--kb-inset', `${inset}px`);
      root.style.setProperty('--visual-viewport-center-y', `${Math.round(offsetTop + vh / 2)}px`);
    };

    update();
    window.addEventListener('resize', update);
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);
};