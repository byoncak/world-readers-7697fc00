import { useState, useEffect, useRef } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { Search, X } from 'lucide-react';

const gf = new GiphyFetch('0CBIZkAXibDEtlGNlcvsLEIuMq5x9oTE');

interface GiphyPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const GiphyPicker = ({ onSelect, onClose }: GiphyPickerProps) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(320);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setGridWidth(Math.floor(w));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const fetchGifs = (offset: number) => {
    const promise = debouncedSearch.trim()
      ? gf.search(debouncedSearch, { offset, limit: 10 })
      : gf.trending({ offset, limit: 10 });
    promise.finally(() => setLoading(false));
    return promise;
  };

  return (
    <div className="bg-card text-foreground overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="font-display text-sm text-foreground">GIFs</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close GIF picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GIFs…"
            className="cozy-input w-full pl-8 text-sm h-9 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
      </div>
      <div ref={containerRef} className="max-h-[55vh] overflow-y-auto px-3 pb-2 relative min-h-[160px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="book"><div/><div/><div/><div/><div/></div>
          </div>
        )}
        <Grid
          key={debouncedSearch}
          width={gridWidth}
          columns={2}
          gutter={6}
          fetchGifs={fetchGifs}
          onGifClick={(gif, e) => {
            e.preventDefault();
            onSelect(gif.images.fixed_height.url);
          }}
          noLink
        />
      </div>
      <div className="px-3 py-2 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/70 text-center tracking-wide">
          Powered by GIPHY
        </p>
      </div>
    </div>
  );
};

export default GiphyPicker;
