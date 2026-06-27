// Tiny client-side dominant-color sampler.
// Reads a downsized version of an image into a canvas and averages
// non-extreme pixels. Returns an HSL string usable in CSS.
//
// Falls back to null on CORS errors or load failures — callers should
// substitute a neutral palette in that case.

const cache = new Map<string, Promise<string | null>>();

export function dominantColor(url: string): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  const cached = cache.get(url);
  if (cached) return cached;

  const p = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3];
          if (pa < 200) continue;
          const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
          // skip near-white and near-black to avoid covers with big white margins
          if (max > 245 && min > 235) continue;
          if (max < 25) continue;
          r += pr; g += pg; b += pb; n++;
        }
        if (n === 0) return resolve(null);
        r = Math.round(r / n);
        g = Math.round(g / n);
        b = Math.round(b / n);

        // Convert to HSL string
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
            case gn: h = (bn - rn) / d + 2; break;
            case bn: h = (rn - gn) / d + 4; break;
          }
          h /= 6;
        }
        resolve(`${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

  cache.set(url, p);
  return p;
}