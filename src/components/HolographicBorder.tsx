import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HolographicBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 80,
} as const;

const HolographicBorder = memo(({ children, size = 'sm', className }: HolographicBorderProps) => {
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

    // Holographic hue stops: blue(210), cyan(180), green(150), pink(330), purple(270)
    const hueStops = [210, 180, 150, 120, 330, 290, 270, 210];

    const getHue = (progress: number, timeOffset: number) => {
      const shifted = ((progress + timeOffset) % 1 + 1) % 1;
      const idx = shifted * (hueStops.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, hueStops.length - 1);
      const frac = idx - lo;
      let diff = hueStops[hi] - hueStops[lo];
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return ((hueStops[lo] + diff * frac) % 360 + 360) % 360;
    };

    // Morph parameters for subtle gradient shifting
    const getMorph = (t: number) => ({
      hueShift: Math.sin(t * 0.5) * 30,
      satWave: Math.sin(t * 0.7) * 15,
      lightWave: Math.sin(t * 0.6 + 1.2) * 10,
      ringWobble: Math.sin(t * 0.7) * 0.5,
    });

    const draw = (currentTime: number) => {
      const delta = (currentTime - lastFrameRef.current) / 1000;
      timeRef.current += delta;
      lastFrameRef.current = currentTime;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const t = timeRef.current;
      const morph = getMorph(t);
      const segments = 240;

      for (let i = 0; i < segments; i++) {
        const progress = i / segments;
        const angle = progress * Math.PI * 2;
        const nextAngle = ((i + 1) / segments) * Math.PI * 2;

        // Slow hue rotation + morph drift
        const hue = getHue(progress, t * 0.25) + morph.hueShift + Math.sin(angle * 3 + t * 0.2) * 8;

        // Sweep highlight
        const sweepAngle = (t * 0.8) % (Math.PI * 2);
        const angleDiff = Math.abs(Math.atan2(Math.sin(angle - sweepAngle), Math.cos(angle - sweepAngle)));
        const highlight = Math.exp(-angleDiff * angleDiff * 2) * 0.4;

        // Second counter-sweep
        const sweepAngle2 = (-t * 0.6) % (Math.PI * 2);
        const angleDiff2 = Math.abs(Math.atan2(Math.sin(angle - sweepAngle2), Math.cos(angle - sweepAngle2)));
        const highlight2 = Math.exp(-angleDiff2 * angleDiff2 * 3) * 0.25;

        // Sparkle
        const sparkle = 0.06 * Math.sin(angle * 16 + t * 4);

        // Bevel: 3 sub-bands with morphing radii
        const bevelSteps = 3;
        for (let b = 0; b < bevelSteps; b++) {
          const wobbledOuter = outerRadius + morph.ringWobble * Math.sin(angle * 2 + t);
          const wobbledInner = innerRadius - morph.ringWobble * Math.sin(angle * 2 + t + 1);
          const rOuter = wobbledOuter - (b / bevelSteps) * (wobbledOuter - wobbledInner);
          const rInner = wobbledOuter - ((b + 1) / bevelSteps) * (wobbledOuter - wobbledInner);

          let lightness: number;
          if (b === 0) lightness = 55 + (highlight + highlight2 + sparkle) * 40 + morph.lightWave;
          else if (b === bevelSteps - 1) lightness = 72 + (highlight + highlight2 + sparkle) * 35 + morph.lightWave;
          else lightness = 62 + (highlight + highlight2 + sparkle) * 45 + morph.lightWave;

          const saturation = 75 + highlight * 25 + morph.satWave;

          ctx.beginPath();
          ctx.arc(centerX, centerY, rOuter, angle - 0.02, nextAngle + 0.02);
          ctx.arc(centerX, centerY, rInner, nextAngle + 0.02, angle - 0.02, true);
          ctx.closePath();
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fill();
        }
      }

      // Dark outer edge
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius - 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 130, 200, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Bright inner edge
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius + 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Outer glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(150, 180, 255, 0.15)';
      ctx.lineWidth = 2;
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
      <div className="relative z-[1] h-full w-full">{children}</div>
    </div>
  );
});

HolographicBorder.displayName = 'HolographicBorder';
export default HolographicBorder;
