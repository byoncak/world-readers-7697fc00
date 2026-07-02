/**
 * celebrate(x, y, options?) — a cozy confetti burst.
 *
 * Imperative and dependency-free (same pattern as spawnPointsPop): injects
 * absolutely-positioned pieces into a fixed portal layer and lets CSS run the
 * show via the `confetti-fall` keyframes in index.css. Pieces self-remove.
 *
 * Respects prefers-reduced-motion (renders nothing).
 */

interface CelebrateOptions {
  /** How many pieces. Default 26. */
  count?: number;
  /** Emoji sprinkled among the paper bits. Default cozy set. */
  emojis?: string[];
  /** Spread of the initial upward burst in px. Default 140. */
  power?: number;
}

const PAPER_COLORS = [
  'hsl(15 55% 55%)',   // terracotta
  'hsl(145 25% 62%)',  // sage
  'hsl(270 30% 72%)',  // lavender
  'hsl(40 60% 62%)',   // soft gold
  'hsl(20 80% 78%)',   // peach
];

const DEFAULT_EMOJIS = ['✨', '🍎', '📚'];

let layer: HTMLDivElement | null = null;
function getLayer(): HTMLDivElement {
  if (layer && document.body.contains(layer)) return layer;
  layer = document.createElement('div');
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '99999',
    overflow: 'hidden',
  });
  document.body.appendChild(layer);
  return layer;
}

export function celebrate(x: number, y: number, options: CelebrateOptions = {}) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { count = 26, emojis = DEFAULT_EMOJIS, power = 140 } = options;
  const host = getLayer();

  for (let i = 0; i < count; i++) {
    const isEmoji = Math.random() < 0.28;
    const el = document.createElement('span');

    // Launch angle: mostly upward fan, gravity implied by a downward endpoint.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = power * (0.45 + Math.random() * 0.85);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed + (160 + Math.random() * 160); // fall past origin
    const rot = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
    const duration = 900 + Math.random() * 700;

    if (isEmoji) {
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.fontSize = `${12 + Math.random() * 10}px`;
    } else {
      const size = 5 + Math.random() * 6;
      Object.assign(el.style, {
        width: `${size}px`,
        height: `${size * (0.6 + Math.random() * 0.8)}px`,
        background: PAPER_COLORS[Math.floor(Math.random() * PAPER_COLORS.length)],
        borderRadius: Math.random() < 0.5 ? '9999px' : '2px',
      });
    }

    Object.assign(el.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      display: 'inline-block',
      willChange: 'transform, opacity',
      animation: `confetti-fall ${duration}ms cubic-bezier(0.15, 0.6, 0.45, 1) forwards`,
    });
    el.style.setProperty('--c-dx', `${dx}px`);
    el.style.setProperty('--c-dy', `${dy}px`);
    el.style.setProperty('--c-rot', `${rot}deg`);
    el.style.setProperty('--c-scale', `${0.8 + Math.random() * 0.5}`);

    host.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/** Convenience: burst from the center of a DOM element. */
export function celebrateFromElement(el: HTMLElement | null, options?: CelebrateOptions) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  celebrate(r.left + r.width / 2, r.top + r.height / 2, options);
}
