import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChromeBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 80,
} as const;

const ChromeBorder = memo(({ children, size = 'sm', className }: ChromeBorderProps) => {
  const baseDims = sizeMap[size];
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Measured size — lets className overrides (e.g. `!h-6 !w-6`) win over the size preset
  const [dims, setDims] = useState<number>(baseDims);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);

  const ringWidth = Math.max(2, Math.round(dims * 0.075 * 10) / 10);
  const padding = Math.max(4, Math.round(dims * 0.13));
  const totalSize = dims + padding * 2;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const next = Math.round(Math.min(rect.width, rect.height));
      if (next > 0) setDims(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = totalSize * dpr;
    canvas.height = totalSize * dpr;
    canvas.style.width = `${totalSize}px`;
    canvas.style.height = `${totalSize}px`;

    const centerX = totalSize / 2;
    const centerY = totalSize / 2;
    const outerRadius = dims / 2 + ringWidth / 2;
    const innerRadius = dims / 2 - ringWidth / 2;

    const draw = (currentTime: number) => {
      const delta = (currentTime - lastFrameRef.current) / 1000;
      timeRef.current += delta;
      lastFrameRef.current = currentTime;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const t = timeRef.current;
      const segments = 240;

      const midRadius = (outerRadius + innerRadius) / 2;
      const halfRing = (outerRadius - innerRadius) / 2;

      for (let i = 0; i < segments; i++) {
        const progress = i / segments;
        const angle = progress * Math.PI * 2;
        const nextAngle = ((i + 1) / segments) * Math.PI * 2;

        const baseChrome = 0.45 + 0.25 * Math.sin(angle * 4 + t * 0.6);
        const sweepAngle = (t * 1.2) % (Math.PI * 2);
        const angleDiff = Math.abs(Math.atan2(Math.sin(angle - sweepAngle), Math.cos(angle - sweepAngle)));
        const highlight = Math.exp(-angleDiff * angleDiff * 2) * 0.55;
        const sweepAngle2 = (-t * 0.7) % (Math.PI * 2);
        const angleDiff2 = Math.abs(Math.atan2(Math.sin(angle - sweepAngle2), Math.cos(angle - sweepAngle2)));
        const highlight2 = Math.exp(-angleDiff2 * angleDiff2 * 3) * 0.35;
        const sparkle = 0.08 * Math.sin(angle * 12 + t * 3);
        const brightness = Math.min(1, baseChrome + highlight + highlight2 + sparkle);

        // Bevel: draw 3 sub-bands — lit top edge, mid face, shadowed bottom edge
        const bevelSteps = 3;
        for (let b = 0; b < bevelSteps; b++) {
          const bevelFrac = b / (bevelSteps - 1); // 0 = outer, 1 = inner
          const rOuter = outerRadius - (b / bevelSteps) * (outerRadius - innerRadius);
          const rInner = outerRadius - ((b + 1) / bevelSteps) * (outerRadius - innerRadius);

          // Bevel lighting: dark outer edge, bright inner edge
          let bevelMod: number;
          if (b === 0) bevelMod = -0.2;        // outer — darker shadow
          else if (b === bevelSteps - 1) bevelMod = 0.22; // inner — bright highlight
          else bevelMod = 0;                   // mid face

          const bv = Math.min(1, Math.max(0, brightness + bevelMod));
          const r = Math.floor(100 + bv * 155);
          const g = Math.floor(105 + bv * 150);
          const bCol = Math.floor(115 + bv * 140);

          ctx.beginPath();
          ctx.arc(centerX, centerY, rOuter, angle - 0.02, nextAngle + 0.02);
          ctx.arc(centerX, centerY, rInner, nextAngle + 0.02, angle - 0.02, true);
          ctx.closePath();
          ctx.fillStyle = `rgb(${r}, ${g}, ${bCol})`;
          ctx.fill();
        }
      }

      // Dark outer edge
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius - 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Bright inner edge
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius + 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Subtle outer glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 210, 230, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dims, totalSize, ringWidth]);

  return (
    <div
      ref={containerRef}
      className={cn('relative shrink-0', className)}
      style={{ width: baseDims, height: baseDims, overflow: 'visible' }}
    >
      {/* Canvas for the chrome ring */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${totalSize}px`,
          height: `${totalSize}px`,
          zIndex: 2,
        }}
      />

      {/* Children (avatar) */}
      <div className="relative z-[1] h-full w-full">{children}</div>
    </div>
  );
});

ChromeBorder.displayName = 'ChromeBorder';
export default ChromeBorder;
