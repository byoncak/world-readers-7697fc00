/**
 * Lightweight floating reward animation.
 * Call `spawnPointsPop(amount)` from anywhere — it reads the last pointer
 * position and injects a DOM element that floats up and self-removes.
 */

// Track last pointer position
let lastX = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
let lastY = typeof window !== 'undefined' ? window.innerHeight / 3 : 200;

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    lastX = e.clientX;
    lastY = e.clientY;
  }, true);
}

// Inject the keyframes once
let styleInjected = false;
function ensureStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes _ppFloatUp {
      0%   { opacity: 1; transform: translate(-50%, -50%) translateY(0) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) translateY(-100px) scale(1.15); }
    }
  `;
  document.head.appendChild(style);
}

export function spawnPointsPop(amount: number) {
  if (amount <= 0) return;
  ensureStyle();

  const el = document.createElement('div');
  el.textContent = `🍎 +${amount}`;
  Object.assign(el.style, {
    position: 'fixed',
    left: `${lastX}px`,
    top: `${lastY}px`,
    transform: 'translate(-50%, -50%)',
    fontSize: '1.25rem',
    fontWeight: '900',
    color: '#e74c3c',
    pointerEvents: 'none',
    zIndex: '9999',
    textShadow: '0 1px 4px rgba(0,0,0,0.15)',
    animation: '_ppFloatUp 1.4s ease-out forwards',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// The component is a no-op — everything is imperative.
const PointsPopAnimation = () => null;
export default PointsPopAnimation;
