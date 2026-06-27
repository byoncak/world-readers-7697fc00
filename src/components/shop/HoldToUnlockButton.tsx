import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';
import { usePendingSpend } from '@/contexts/PendingSpendContext';

const HOLD_DURATION = 1500; // ms
const FLIGHT_DURATION = 600; // ms per apple
const MAX_IN_FLIGHT = 30;
const MAX_TOTAL_SPAWN = 30; // visible apples cap; we still deduct full price on counter

interface FlyingApple {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  midOffsetX: number;
  midOffsetY: number;
  startedAt: number;
  reverse: boolean; // true = flying back to supply
}

interface Props {
  price: number;
  canAfford: boolean;
  testMode: boolean;
  onUnlock: () => void;
  disabled?: boolean;
}

let styleInjected = false;
function ensureStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes _btnVibrate {
      0%, 100% { transform: translate(0, 0); }
      20% { transform: translate(-2px, 1px) rotate(-0.4deg); }
      40% { transform: translate(2px, -1px) rotate(0.4deg); }
      60% { transform: translate(-1.5px, -1.5px) rotate(-0.3deg); }
      80% { transform: translate(1.5px, 1.5px) rotate(0.3deg); }
    }
    @keyframes _btnVibrateHard {
      0%, 100% { transform: translate(0, 0); }
      15% { transform: translate(-3px, 2px) rotate(-0.7deg); }
      30% { transform: translate(3px, -2px) rotate(0.7deg); }
      45% { transform: translate(-2.5px, -2px) rotate(-0.5deg); }
      60% { transform: translate(2.5px, 2px) rotate(0.5deg); }
      75% { transform: translate(-2px, 1.5px) rotate(-0.6deg); }
      90% { transform: translate(2px, -1.5px) rotate(0.6deg); }
    }
    @keyframes _unlockFlash {
      0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.6); }
      100% { box-shadow: 0 0 0 12px hsl(var(--primary) / 0); }
    }
  `;
  document.head.appendChild(style);
}

const HoldToUnlockButton = ({ price, canAfford, testMode, onUnlock, disabled }: Props) => {
  const { addPending, removePending, reset } = usePendingSpend();
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [flyingApples, setFlyingApples] = useState<FlyingApple[]>([]);
  const [flash, setFlash] = useState(false);

  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const flightRafRef = useRef<number>(0);
  const spawnedCountRef = useRef(0);
  const pendingAppliedRef = useRef(0); // how much we've added to pendingSpend so far this hold
  const lastSpawnRef = useRef<number>(0);
  const completedRef = useRef(false);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const appleIdRef = useRef(0);

  useEffect(() => {
    ensureStyle();
    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(flightRafRef.current);
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reallyDisabled = disabled || (!testMode && !canAfford);

  const getSourceRect = useCallback((): { x: number; y: number } | null => {
    const el = document.querySelector('[data-points-source]') as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const getButtonCenter = useCallback((): { x: number; y: number } | null => {
    const el = buttonRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const tickFlights = useCallback(() => {
    const now = performance.now();
    setFlyingApples((prev) => {
      const next: FlyingApple[] = [];
      for (const a of prev) {
        if (now - a.startedAt < FLIGHT_DURATION) {
          next.push(a);
        }
        // arrival no longer drives the counter — counter is driven by hold progress
      }
      return next;
    });
    flightRafRef.current = requestAnimationFrame(tickFlights);
  }, []);

  const spawnApple = useCallback((reverse = false) => {
    const src = getSourceRect();
    const dst = getButtonCenter();
    if (!src || !dst) return;
    const from = reverse ? dst : src;
    const to = reverse ? src : dst;
    const id = ++appleIdRef.current;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // perpendicular jitter for a nice arc
    const len = Math.max(1, Math.hypot(dx, dy));
    const px = -dy / len;
    const py = dx / len;
    const arcAmt = (40 + Math.random() * 40) * (Math.random() < 0.5 ? -1 : 1);
    setFlyingApples((prev) => [
      ...prev,
      {
        id,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        midOffsetX: px * arcAmt,
        midOffsetY: py * arcAmt - 30,
        startedAt: performance.now(),
        reverse,
      },
    ]);
  }, [getSourceRect, getButtonCenter]);

  const stopHold = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startedRef.current = false;
    setHolding(false);
    setProgress(0);
  }, []);

  const tick = useCallback((now: number) => {
    const elapsed = now - startRef.current;
    const p = Math.min(1, elapsed / HOLD_DURATION);
    setProgress(p);

    // Haptics are pre-scheduled in startHold() (must run inside the user
    // gesture). Do not call navigator.vibrate from this rAF loop — browsers
    // silently ignore it because the gesture activation has expired.

    // Drive the counter by hold progress (proportional to price).
    const targetPending = Math.floor(p * price);
    const delta = targetPending - pendingAppliedRef.current;
    if (delta > 0) {
      addPending(delta);
      pendingAppliedRef.current = targetPending;
    }

    // Spawn visual apples — capped at MAX_TOTAL_SPAWN total, spread across hold.
    const totalToSpawn = Math.min(price, MAX_TOTAL_SPAWN);
    const interval = HOLD_DURATION / totalToSpawn;
    const desired = Math.min(totalToSpawn, Math.floor(elapsed / interval));
    while (
      spawnedCountRef.current < desired &&
      flyingApples.length < MAX_IN_FLIGHT &&
      now - lastSpawnRef.current >= 15
    ) {
      spawnApple(false);
      spawnedCountRef.current += 1;
      lastSpawnRef.current = now;
    }

    if (p >= 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        setFlash(true);
        setTimeout(() => setFlash(false), 500);
        // Ensure counter shows exactly `price` spent.
        const missing = price - pendingAppliedRef.current;
        if (missing > 0) {
          addPending(missing);
          pendingAppliedRef.current = price;
        }
        onUnlock();
        // pending will reset on unmount or be cleared after server refetches
        setTimeout(() => reset(), 800);
      }
      stopHold();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [price, spawnApple, onUnlock, stopHold, flyingApples.length, addPending, reset]);

  const startHold = useCallback(() => {
    if (reallyDisabled || startedRef.current) return;
    startedRef.current = true;
    completedRef.current = false;
    cancelledRef.current = false;
    spawnedCountRef.current = 0;
    pendingAppliedRef.current = 0;
    lastSpawnRef.current = 0;
    startRef.current = performance.now();
    setHolding(true);
    rafRef.current = requestAnimationFrame(tick);
    flightRafRef.current = requestAnimationFrame(tickFlights);
  }, [reallyDisabled, tick, tickFlights]);

  const cancelHold = useCallback(() => {
    if (completedRef.current) return;
    if (cancelledRef.current) return;
    cancelledRef.current = true;
    stopHold();
    // Restore the counter back to its original value.
    const toRestore = pendingAppliedRef.current;
    if (toRestore > 0) removePending(toRestore);
    pendingAppliedRef.current = 0;
    // Visual: send a few apples flying back to the supply for feedback (capped).
    const visualReturns = Math.min(toRestore, MAX_TOTAL_SPAWN);
    for (let i = 0; i < visualReturns; i++) {
      setTimeout(() => spawnApple(true), i * 30);
    }
  }, [stopHold, spawnApple, removePending]);

  const label = reallyDisabled
    ? 'Need more 🍎'
    : testMode
      ? '🧪 Hold to Claim'
      : '🔒 Hold to Unlock';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={reallyDisabled}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative overflow-hidden select-none rounded-xl text-xs font-semibold px-3 py-1.5 transition-colors ${
          reallyDisabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
        style={{
          animation: holding
            ? `${progress > 0.6 ? '_btnVibrateHard' : '_btnVibrate'} 0.05s linear infinite`
            : flash
              ? '_unlockFlash 0.5s ease-out'
              : undefined,
          touchAction: 'none',
        }}
      >
        <span
          className="absolute inset-y-0 left-0 bg-primary-foreground/25 transition-none"
          style={{ width: `${progress * 100}%` }}
          aria-hidden
        />
        <span className="relative inline-flex items-center gap-1">
          {reallyDisabled && <Lock className="h-3 w-3" />}
          {label}
        </span>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[99999]" aria-hidden>
            {flyingApples.map((a) => {
              const dx = a.toX - a.fromX;
              const dy = a.toY - a.fromY;
              return (
                <span
                  key={a.id}
                  className="absolute text-base will-change-transform"
                  style={{
                    left: 0,
                    top: 0,
                    transform: `translate(${a.fromX}px, ${a.fromY}px)`,
                    animation: `_appleFly_${a.id} ${FLIGHT_DURATION}ms cubic-bezier(.5,.05,.5,.95) forwards`,
                  }}
                >
                  <style>{`
                    @keyframes _appleFly_${a.id} {
                      0% {
                        transform: translate(${a.fromX}px, ${a.fromY}px) scale(1);
                        opacity: 0;
                      }
                      15% { opacity: 1; }
                      50% {
                        transform: translate(${a.fromX + dx * 0.5 + a.midOffsetX}px, ${a.fromY + dy * 0.5 + a.midOffsetY}px) scale(1.1);
                      }
                      100% {
                        transform: translate(${a.toX}px, ${a.toY}px) scale(0.4);
                        opacity: 0.2;
                      }
                    }
                  `}</style>
                  🍎
                </span>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

export default HoldToUnlockButton;
