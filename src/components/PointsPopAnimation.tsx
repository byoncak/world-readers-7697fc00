/**
 * Floating reward animation.
 * Call `spawnPointsPop(amount)` to display a queued/aggregated
 * "+🍎" toast anchored near the last pointer position.
 *
 * Behavior:
 *   • Stays visible ~4.5s with a gentle fade
 *   • Pauses while hovered / focused
 *   • Aggregates rapid successive awards into a single element
 *   • Announces via a polite aria-live region
 *   • Respects prefers-reduced-motion
 */

let lastX = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
let lastY = typeof window !== 'undefined' ? window.innerHeight / 3 : 200;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
    },
    true,
  );
}

let styleInjected = false;
function ensureStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes _ppFloatUp {
      0%   { opacity: 0; transform: translate(-50%, -50%) translateY(6px) scale(0.9); }
      10%  { opacity: 1; transform: translate(-50%, -50%) translateY(0) scale(1); }
      85%  { opacity: 1; transform: translate(-50%, -50%) translateY(-56px) scale(1.05); }
      100% { opacity: 0; transform: translate(-50%, -50%) translateY(-90px) scale(1.05); }
    }
    @keyframes _ppFadeOnly {
      0% { opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { opacity: 0; }
    }
    ._pp-live {
      position: fixed;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
      pointer-events: none;
    }
    ._pp-pop {
      position: fixed;
      transform: translate(-50%, -50%);
      font-size: 1.25rem;
      font-weight: 900;
      color: #e74c3c;
      pointer-events: auto;
      z-index: 9999;
      text-shadow: 0 1px 4px rgba(0,0,0,0.15);
      animation: _ppFloatUp 4500ms ease-out forwards;
      white-space: nowrap;
      user-select: none;
      cursor: default;
    }
    ._pp-pop:hover, ._pp-pop:focus-within { animation-play-state: paused; }
    @media (prefers-reduced-motion: reduce) {
      ._pp-pop { animation: _ppFadeOnly 4500ms ease-out forwards; }
    }
  `;
  document.head.appendChild(style);
}

// Live region for screen readers.
let liveEl: HTMLElement | null = null;
function ensureLive() {
  if (liveEl) return liveEl;
  liveEl = document.createElement('div');
  liveEl.className = '_pp-live';
  liveEl.setAttribute('role', 'status');
  liveEl.setAttribute('aria-live', 'polite');
  liveEl.setAttribute('aria-atomic', 'true');
  document.body.appendChild(liveEl);
  return liveEl;
}

// Aggregation window: if a new award arrives within this window,
// merge into the most recent visible pop instead of stacking a new one.
const AGGREGATE_MS = 1200;
let recentEl: HTMLDivElement | null = null;
let recentAmount = 0;
let recentAt = 0;

export function spawnPointsPop(amount: number) {
  if (!amount || amount <= 0) return;
  if (typeof document === 'undefined') return;
  ensureStyle();

  const now = Date.now();
  if (recentEl && now - recentAt < AGGREGATE_MS && document.body.contains(recentEl)) {
    recentAmount += amount;
    recentEl.textContent = `🍎 +${recentAmount}`;
    recentAt = now;
    ensureLive().textContent = `Earned ${recentAmount} apples`;
    return;
  }

  recentAmount = amount;
  recentAt = now;

  const el = document.createElement('div');
  el.className = '_pp-pop';
  el.textContent = `🍎 +${amount}`;
  el.style.left = `${lastX}px`;
  el.style.top = `${Math.max(80, lastY)}px`;
  el.setAttribute('role', 'presentation');
  el.tabIndex = -1;

  el.addEventListener('click', () => el.remove());
  el.addEventListener('animationend', () => {
    if (recentEl === el) recentEl = null;
    el.remove();
  });

  document.body.appendChild(el);
  recentEl = el;
  ensureLive().textContent = `Earned ${amount} apples`;
}

const PointsPopAnimation = () => null;
export default PointsPopAnimation;
