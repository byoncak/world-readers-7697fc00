import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  claiming: boolean;
  onClaim: () => Promise<void> | void;
}

/* ── physics config ── */
const APPLE_COUNT = 25;
const CONFETTI_COUNT = 40;
const GRAVITY = 980; // px/s²
const APPLE_EMOJI = '🍎';
const CONFETTI_COLORS = [
  'hsl(0 84% 60%)',   // red
  'hsl(45 93% 58%)',  // gold
  'hsl(142 71% 45%)', // green
  'hsl(217 91% 60%)', // blue
  'hsl(292 84% 61%)', // purple
  'hsl(25 95% 53%)',  // orange
  'hsl(330 81% 60%)', // pink
];

interface FallingApple {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  width: number;
  height: number;
}

const HOLD_DURATION = 1200; // ms to hold

/** Shared physics spawn — used by component and exported for test trigger */
function spawnAppleRain(
  applesRef: React.MutableRefObject<FallingApple[]>,
  setApples: React.Dispatch<React.SetStateAction<FallingApple[]>>,
  confettiRef: React.MutableRefObject<ConfettiPiece[]>,
  setConfetti: React.Dispatch<React.SetStateAction<ConfettiPiece[]>>,
  appleRafRef: React.MutableRefObject<number>,
  onDone: () => void,
) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.35;

  const spawned: FallingApple[] = Array.from({ length: APPLE_COUNT }, (_, i) => ({
    id: i,
    x: cx + (Math.random() - 0.5) * 120,
    y: cy + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 500,
    vy: -(Math.random() * 400 + 200),
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 720,
    size: 20 + Math.random() * 16,
  }));

  const confetti: ConfettiPiece[] = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    x: cx + (Math.random() - 0.5) * 80,
    y: cy + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 700,
    vy: -(Math.random() * 500 + 300),
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 1080,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    width: 6 + Math.random() * 6,
    height: 10 + Math.random() * 10,
  }));

  applesRef.current = spawned;
  setApples(spawned);
  confettiRef.current = confetti;
  setConfetti(confetti);

  let lastTime = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const floor = window.innerHeight - 20;

    const updatedApples = applesRef.current.map((a) => {
      let ny = a.y + a.vy * dt;
      let nvy = a.vy + GRAVITY * dt;
      let nvx = a.vx * 0.995;
      let nx = a.x + nvx * dt;
      const nr = a.rotation + a.rotationSpeed * dt;
      if (ny >= floor) { ny = floor; nvy = -Math.abs(nvy) * 0.4; if (Math.abs(nvy) < 40) nvy = 0; }
      if (nx < 10) { nx = 10; nvx = Math.abs(nvx) * 0.5; }
      if (nx > window.innerWidth - 10) { nx = window.innerWidth - 10; nvx = -Math.abs(nvx) * 0.5; }
      return { ...a, x: nx, y: ny, vx: nvx, vy: nvy, rotation: nr };
    });

    const updatedConfetti = confettiRef.current.map((c) => {
      let ny = c.y + c.vy * dt;
      let nvy = c.vy + GRAVITY * 0.6 * dt; // lighter gravity for floaty feel
      let nvx = c.vx * 0.98; // more air drag
      let nx = c.x + nvx * dt;
      const nr = c.rotation + c.rotationSpeed * dt;
      if (ny >= floor) { ny = floor; nvy = -Math.abs(nvy) * 0.25; if (Math.abs(nvy) < 30) nvy = 0; }
      if (nx < 5) { nx = 5; nvx = Math.abs(nvx) * 0.3; }
      if (nx > window.innerWidth - 5) { nx = window.innerWidth - 5; nvx = -Math.abs(nvx) * 0.3; }
      return { ...c, x: nx, y: ny, vx: nvx, vy: nvy, rotation: nr };
    });

    applesRef.current = updatedApples;
    confettiRef.current = updatedConfetti;
    setApples([...updatedApples]);
    setConfetti([...updatedConfetti]);
    appleRafRef.current = requestAnimationFrame(tick);
  };
  appleRafRef.current = requestAnimationFrame(tick);

  setTimeout(() => {
    const portal = document.getElementById('apple-rain-portal');
    if (portal) portal.style.transition = 'opacity 1.5s ease-out';
    if (portal) portal.style.opacity = '0';
  }, 3500);

  setTimeout(() => {
    cancelAnimationFrame(appleRafRef.current);
    setApples([]);
    setConfetti([]);
    onDone();
  }, 5000);
}

const DailyRewardClaim = ({ claiming, onClaim }: Props) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [apples, setApples] = useState<FallingApple[]>([]);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const holdStart = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const completed = useRef(false);
  const appleRafRef = useRef<number>(0);
  const applesRef = useRef<FallingApple[]>([]);
  const confettiRef = useRef<ConfettiPiece[]>([]);

  /* ── hold progress loop ── */
  const tickProgress = useCallback(() => {
    if (!holdStart.current) return;
    const elapsed = Date.now() - holdStart.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(pct);

    if (pct >= 1 && !completed.current) {
      completed.current = true;
      triggerExplosion();
      return;
    }
    rafRef.current = requestAnimationFrame(tickProgress);
  }, []);

  const startHold = useCallback(() => {
    if (claiming || exploded) return;
    completed.current = false;
    holdStart.current = Date.now();
    setHolding(true);
    setProgress(0);
    rafRef.current = requestAnimationFrame(tickProgress);
  }, [claiming, exploded, tickProgress]);

  const cancelHold = useCallback(() => {
    if (completed.current) return;
    holdStart.current = 0;
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  /* ── explosion + apple rain ── */
  const triggerExplosion = useCallback(() => {
    setHolding(false);
    setExploded(true);

    spawnAppleRain(applesRef, setApples, confettiRef, setConfetti, appleRafRef, () => {
      setExploded(false);
      setProgress(0);
      completed.current = false;
      onClaim();
    });
  }, [onClaim]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(appleRafRef.current);
    };
  }, []);

  if (exploded && apples.length === 0) return null;

  return (
    <>
      {/* The claim button area */}
      {!exploded && (
        <div className="p-3 border-b border-border">
          <button
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={claiming}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg bg-accent/50 hover:bg-accent px-3 py-2.5 text-left transition-all disabled:opacity-50 select-none touch-none',
              holding && 'scale-[0.97]'
            )}
            style={{
              animation: holding ? 'reward-shake 0.08s ease-in-out infinite alternate' : undefined,
            }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Gift className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-serif font-semibold text-sm text-foreground">Daily Login Reward</p>
              <p className="text-xs text-muted-foreground font-body">
                {holding ? 'Keep holding…' : 'Hold to claim 25 🍎'}
              </p>
              {/* Progress bar */}
              <div className="mt-1.5 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-none"
                  style={{
                    width: `${progress * 100}%`,
                    background: progress < 0.8
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--destructive, 0 84% 60%))',
                    transition: holding ? 'none' : 'width 0.2s ease-out',
                  }}
                />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Portal explosion + apples to document.body so they render above everything */}
      {(exploded && apples.length > 0) && createPortal(
        <>
          {/* Explosion flash */}
          <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 99998 }}>
            <div
              className="absolute inset-0 bg-background/60"
              style={{ animation: 'reward-flash 0.4s ease-out forwards' }}
            />
          </div>

          {/* Falling apples */}
          <div id="apple-rain-portal" className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 99999 }}>
            {apples.map((a) => (
              <div
                key={`a-${a.id}`}
                className="absolute"
                style={{
                  left: a.x,
                  top: a.y,
                  fontSize: a.size,
                  transform: `translate(-50%, -50%) rotate(${a.rotation}deg)`,
                  willChange: 'transform, left, top',
                }}
              >
                {APPLE_EMOJI}
              </div>
            ))}
            {confetti.map((c) => (
              <div
                key={`c-${c.id}`}
                className="absolute rounded-sm"
                style={{
                  left: c.x,
                  top: c.y,
                  width: c.width,
                  height: c.height,
                  backgroundColor: c.color,
                  transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`,
                  willChange: 'transform, left, top',
                }}
              />
            ))}
          </div>
        </>,
        document.body
      )}

      {/* Inject keyframes */}
      <style>{`
        @keyframes reward-shake {
          0% { transform: translate(-1px, -1px) rotate(-0.5deg); }
          100% { transform: translate(1px, 1px) rotate(0.5deg); }
        }
        @keyframes reward-flash {
          0% { opacity: 0.7; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default DailyRewardClaim;

/** Standalone overlay for testing — trigger apple rain without the hold button */
export const AppleRainOverlay = ({ active, onDone }: { active: boolean; onDone: () => void }) => {
  const applesRef = useRef<FallingApple[]>([]);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const appleRafRef = useRef<number>(0);
  const [apples, setApples] = useState<FallingApple[]>([]);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const triggered = useRef(false);

  useEffect(() => {
    if (active && !triggered.current) {
      triggered.current = true;
      spawnAppleRain(applesRef, setApples, confettiRef, setConfetti, appleRafRef, () => {
        triggered.current = false;
        onDone();
      });
    }
  }, [active, onDone]);

  useEffect(() => () => cancelAnimationFrame(appleRafRef.current), []);

  if (apples.length === 0) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 99998 }}>
        <div className="absolute inset-0 bg-background/60" style={{ animation: 'reward-flash 0.4s ease-out forwards' }} />
      </div>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 99999 }}>
        {apples.map((a) => (
          <div key={a.id} className="absolute" style={{ left: a.x, top: a.y, fontSize: a.size, transform: `translate(-50%, -50%) rotate(${a.rotation}deg)` }}>
            {APPLE_EMOJI}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes reward-flash { 0% { opacity: 0.7; } 100% { opacity: 0; } }
      `}</style>
    </>,
    document.body
  );
};
