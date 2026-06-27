import { useState, useEffect, useCallback, useRef } from 'react';

interface SparkleData {
  id: string;
  createdAt: number;
  color: string;
  size: number;
  style: React.CSSProperties;
}

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min;

const DEFAULT_COLOR = '#c7d2fe'; // soft indigo

const generateSparkle = (color: string = DEFAULT_COLOR): SparkleData => ({
  id: String(random(10000, 99999)),
  createdAt: Date.now(),
  color,
  size: random(10, 20),
  style: {
    top: random(-10, 110) + '%',
    left: random(-10, 110) + '%',
  },
});

// Hook: like setInterval but picks a random delay each iteration
function useRandomInterval(
  callback: () => void,
  minDelay: number | null,
  maxDelay: number | null
) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; });

  useEffect(() => {
    if (minDelay === null || maxDelay === null) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const delay = random(minDelay, maxDelay);
      timeoutId = setTimeout(() => {
        savedCallback.current();
        tick();
      }, delay);
    };

    tick();
    return () => clearTimeout(timeoutId);
  }, [minDelay, maxDelay]);
}

const SparkleInstance = ({ color, size, style }: { color: string; size: number; style: React.CSSProperties }) => {
  const path =
    'M26.5 25.5C19.0043 33.3697 0 34 0 34C0 34 19.1013 35.3684 26.5 43.5C33.234 50.901 34 68 34 68C34 68 36.9884 50.7065 44.5 43.5C51.6431 36.647 68 34 68 34C68 34 51.6947 32.0939 44.5 25.5C36.5605 18.2235 34 0 34 0C34 0 33.6591 17.9837 26.5 25.5Z';

  return (
    <span className="sparkle-wrapper" style={style}>
      <svg
        className="sparkle-svg"
        width={size}
        height={size}
        viewBox="0 0 68 68"
        fill="none"
      >
        <path d={path} fill={color} />
      </svg>
    </span>
  );
};

interface SparklesProps {
  color?: string;
  children: React.ReactNode;
  className?: string;
}

const Sparkles = ({ color = DEFAULT_COLOR, children, className }: SparklesProps) => {
  const [sparkles, setSparkles] = useState<SparkleData[]>(() =>
    Array.from({ length: 3 }, () => generateSparkle(color))
  );

  useRandomInterval(
    () => {
      const sparkle = generateSparkle(color);
      const now = Date.now();
      const nextSparkles = sparkles.filter(sp => now - sp.createdAt < 750);
      nextSparkles.push(sparkle);
      setSparkles(nextSparkles);
    },
    50,
    450
  );

  return (
    <span className={`sparkles-container ${className || ''}`}>
      {sparkles.map(sparkle => (
        <SparkleInstance
          key={sparkle.id}
          color={sparkle.color}
          size={sparkle.size}
          style={sparkle.style}
        />
      ))}
      <span className="sparkles-child-wrapper">{children}</span>
    </span>
  );
};

export default Sparkles;
