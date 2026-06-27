import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface TimelineItem {
  title: string;
  author: string;
  year: number | null;
}

interface Props {
  items: TimelineItem[];
  displayName: string;
}

const ReadingTimelineShare = ({ items, displayName }: Props) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // Group by year, descending; unknown last
  const groups = new Map<number | 'unknown', TimelineItem[]>();
  items.forEach((it) => {
    const k = it.year ?? 'unknown';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  });
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return (b as number) - (a as number);
  });

  const handleShare = async () => {
    if (!posterRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f5efe6',
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'reading-timeline.png', { type: 'image/png' });

      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: 'My Reading Timeline',
            text: 'Books I’ve read 🪱📚',
          });
          setBusy(false);
          return;
        } catch (e: any) {
          if (e?.name === 'AbortError') {
            setBusy(false);
            return;
          }
        }
      }

      // Fallback: download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'reading-timeline.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Saved to your downloads 🪱');
    } catch (err) {
      console.error(err);
      toast.error('Could not generate image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={busy || items.length === 0}
        className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/15 text-terracotta px-3 py-1.5 text-xs font-semibold font-body ring-1 ring-terracotta/30 shadow-sm hover:bg-terracotta/25 transition-colors disabled:opacity-50"
        title="Share your reading timeline"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
        Share timeline
      </button>

      {/* Offscreen poster (1080x1920 story-sized) */}
      <div
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          pointerEvents: 'none',
          opacity: 0,
        }}
        aria-hidden
      >
        <div
          ref={posterRef}
          style={{
            width: 1080,
            minHeight: 1920,
            padding: '90px 80px',
            background:
              'linear-gradient(160deg, #f7ecdc 0%, #f0d9c0 45%, #e8c4a8 100%)',
            fontFamily: 'Georgia, "Playfair Display", serif',
            color: '#3b2a1e',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🪱📚</div>
            <div
              style={{
                fontSize: 76,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              {displayName}’s
            </div>
            <div
              style={{
                fontSize: 56,
                fontStyle: 'italic',
                color: '#a05a3c',
                marginTop: 8,
              }}
            >
              Reading Timeline
            </div>
            <div
              style={{
                marginTop: 24,
                fontSize: 26,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                color: '#6b5544',
              }}
            >
              {items.length} {items.length === 1 ? 'book' : 'books'} read
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {sortedKeys.map((k) => {
              const list = groups.get(k)!;
              return (
                <div key={String(k)} style={{ marginBottom: 48 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 52,
                        fontWeight: 700,
                        color: '#a05a3c',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {k === 'unknown' ? '— ' : k}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        background:
                          'linear-gradient(to right, #c98763 0%, transparent 100%)',
                        borderRadius: 2,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 24,
                        fontFamily: '"DM Sans", system-ui, sans-serif',
                        color: '#8a6b58',
                      }}
                    >
                      {list.length} {list.length === 1 ? 'book' : 'books'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {list.map((it, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'rgba(255,255,255,0.55)',
                          borderRadius: 18,
                          padding: '18px 24px',
                          boxShadow: '0 2px 0 rgba(160,90,60,0.12)',
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 22,
                            color: '#c98763',
                            fontFamily: '"DM Sans", system-ui, sans-serif',
                            minWidth: 36,
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 30,
                              fontWeight: 700,
                              lineHeight: 1.25,
                              color: '#3b2a1e',
                            }}
                          >
                            {it.title}
                          </div>
                          <div
                            style={{
                              fontSize: 22,
                              fontFamily: '"DM Sans", system-ui, sans-serif',
                              color: '#6b5544',
                              marginTop: 4,
                              fontStyle: 'italic',
                            }}
                          >
                            {it.author}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: 40,
              fontSize: 24,
              fontFamily: '"DM Sans", system-ui, sans-serif',
              color: '#8a6b58',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Detritivores Book Club
          </div>
        </div>
      </div>
    </>
  );
};

export default ReadingTimelineShare;