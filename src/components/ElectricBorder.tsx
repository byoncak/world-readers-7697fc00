import { memo, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ElectricBorderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Variant key — controls the two-color glow palette */
  variantKey?: string;
}

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 80,
} as const;

// Two-tone palettes per variant: [base ring, animated arc]
const VARIANT_COLORS: Record<string, { base: string; spark: string }> = {
  ember:     { base: '#ff6600', spark: '#ffcc00' },
  voltage:   { base: '#3b82f6', spark: '#22d3ee' },
  toxic:     { base: '#32cd32', spark: '#adff2f' },
  shockwave: { base: '#ff1493', spark: '#ff69b4' },
  arcane:    { base: '#6a1bbd', spark: '#c8a2ff' },
};

const ElectricBorder = memo(({ children, size = 'sm', className, variantKey }: ElectricBorderProps) => {
  const baseDims = sizeMap[size];
  const palette = VARIANT_COLORS[variantKey || ''] || VARIANT_COLORS.ember;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  // Measured size — lets className overrides like `!h-6 !w-6` win over the size preset
  const [dims, setDims] = useState<number>(baseDims);

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

  // Noise helpers
  const random = useCallback((x: number) => {
    return (Math.sin(x * 12.9898) * 43758.5453) % 1;
  }, []);

  const noise2D = useCallback(
    (x: number, y: number) => {
      const i = Math.floor(x);
      const j = Math.floor(y);
      const fx = x - i;
      const fy = y - j;
      const a = random(i + j * 57);
      const b = random(i + 1 + j * 57);
      const c = random(i + (j + 1) * 57);
      const d = random(i + 1 + (j + 1) * 57);
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
    },
    [random]
  );

  const octavedNoise = useCallback(
    (x: number, octaves: number, lacunarity: number, gain: number, baseAmp: number, baseFreq: number, time: number, seed: number) => {
      let y = 0;
      let amp = baseAmp;
      let freq = baseFreq;
      for (let i = 0; i < octaves; i++) {
        y += amp * noise2D(freq * x + seed * 100, time * freq * 0.3);
        freq *= lacunarity;
        amp *= gain;
      }
      return y;
    },
    [noise2D]
  );

  // Configuration tuned for small circular avatars — derived from measured dims
  const speed = 1.2;
  const isLarge = dims >= 64;
  const isMid = dims >= 40 && dims < 64;
  const chaos = isLarge ? 0.08 : 0.06;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const octaves = 6;
    const lacunarity = 1.6;
    const gain = 0.7;
    const frequency = 10;
    const displacement = isLarge ? 16 : isMid ? 9 : Math.max(3, Math.round(dims * 0.14));
    const padding = isLarge ? 20 : isMid ? 12 : Math.max(4, Math.round(dims * 0.16));

    const totalSize = dims + padding * 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = totalSize * dpr;
    canvas.height = totalSize * dpr;
    canvas.style.width = `${totalSize}px`;
    canvas.style.height = `${totalSize}px`;

    const centerX = totalSize / 2;
    const centerY = totalSize / 2;
    const radius = dims / 2;
    const sampleCount = Math.max(80, Math.floor(2 * Math.PI * radius));

    const draw = (currentTime: number) => {
      const delta = (currentTime - lastFrameRef.current) / 1000;
      timeRef.current += delta * speed;
      lastFrameRef.current = currentTime;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Pass 1 — static base ring (clean circle, no noise)
      ctx.strokeStyle = palette.base;
      ctx.lineWidth = isLarge ? 2 : 1.5;
      ctx.shadowColor = palette.base;
      ctx.shadowBlur = isLarge ? 6 : 4;
      ctx.globalAlpha = 0.45;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();

      // Pass 2 — animated spark color (animated noise)
      ctx.strokeStyle = palette.spark;
      ctx.lineWidth = isLarge ? 1.2 : 0.8;
      ctx.shadowColor = palette.spark;
      ctx.shadowBlur = isLarge ? 6 : 4;
      ctx.globalAlpha = 1;

      ctx.beginPath();
      for (let i = 0; i <= sampleCount; i++) {
        const progress = i / sampleCount;
        const angle = progress * Math.PI * 2;
        const xNoise = octavedNoise(progress * 8, octaves, lacunarity, gain, chaos, frequency, timeRef.current, 0);
        const yNoise = octavedNoise(progress * 8, octaves, lacunarity, gain, chaos, frequency, timeRef.current, 1);
        const px = centerX + (radius + xNoise * displacement) * Math.cos(angle);
        const py = centerY + (radius + yNoise * displacement) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Pass 3 — wispy outer sparks
      ctx.globalAlpha = 0.35;
      ctx.shadowBlur = isLarge ? 10 : 6;
      ctx.beginPath();
      for (let i = 0; i <= sampleCount; i++) {
        const progress = i / sampleCount;
        const angle = progress * Math.PI * 2;
        const xNoise = octavedNoise(progress * 8, octaves, lacunarity, gain, chaos * 1.5, frequency, timeRef.current + 5, 2);
        const yNoise = octavedNoise(progress * 8, octaves, lacunarity, gain, chaos * 1.5, frequency, timeRef.current + 5, 3);
        const px = centerX + (radius + xNoise * displacement * 1.2) * Math.cos(angle);
        const py = centerY + (radius + yNoise * displacement * 1.2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dims, isLarge, isMid, chaos, octavedNoise, palette.base, palette.spark]);

  const padding = isLarge ? 20 : isMid ? 12 : Math.max(4, Math.round(dims * 0.16));
  const totalSize = dims + padding * 2;

  return (
    <div
      ref={containerRef}
      className={cn('relative shrink-0', className)}
      style={{ width: baseDims, height: baseDims, overflow: 'visible' }}
    >
      {/* Children (avatar) */}
      <div className="relative z-[1] h-full w-full">{children}</div>

      {/* Canvas for the electric border — in front of avatar */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: totalSize,
          height: totalSize,
          zIndex: 3,
        }}
      />
    </div>
  );
});

ElectricBorder.displayName = 'ElectricBorder';
export default ElectricBorder;
