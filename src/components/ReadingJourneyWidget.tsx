import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Library, Sparkles } from 'lucide-react';
import { LoadingBlock, ErrorBlock } from '@/components/StateBlock';

interface Book {
  id: string;
  title: string;
  author: string;
  status: string;
  cover_url: string | null;
  spine_art_url: string | null;
  meeting_date: string | null;
}

const spineColors = [
  'bg-terracotta text-primary-foreground',
  'bg-secondary text-secondary-foreground',
  'bg-accent text-accent-foreground',
  'bg-soft-gold text-foreground',
  'bg-peach text-foreground',
  'bg-lavender text-foreground',
];

const ReadingJourneyWidget = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('books')
      .select('id, title, author, status, cover_url, spine_art_url, meeting_date')
      .order('selected_date', { ascending: true });
    if (err) setError(true);
    else if (data) setBooks(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <section className="px-5">
        <div className="flex items-center gap-2 mb-3">
          <Library className="h-4 w-4 text-terracotta" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-foreground">Our Bookshelf</h2>
        </div>
        <LoadingBlock label="Loading bookshelf…" rows={2} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="px-5">
        <div className="flex items-center gap-2 mb-3">
          <Library className="h-4 w-4 text-terracotta" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-foreground">Our Bookshelf</h2>
        </div>
        <ErrorBlock message="Couldn't load the bookshelf." onRetry={load} />
      </section>
    );
  }

  if (books.length === 0) {
    return (
      <section className="px-5">
        <div className="flex items-center gap-2 mb-3">
          <Library className="h-4 w-4 text-terracotta" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-foreground">Our Bookshelf</h2>
        </div>
        <p className="text-sm text-muted-foreground font-body">
          Your bookshelf is empty. Start your journey! 🌟
        </p>
      </section>
    );
  }

  return (
    <section className="px-5">
      <div className="flex items-center gap-2 mb-3">
        <Library className="h-4 w-4 text-terracotta" />
        <h2 className="font-display text-lg font-semibold text-foreground">Our Bookshelf</h2>
      </div>

      {/* Bookshelf */}
      <div className="relative overflow-x-auto pb-4">
        <div className="flex items-end gap-1.5 min-w-max px-2">
          {books.map((book, i) => (
            <div
              key={book.id}
              className="group relative"
            >
              {book.status === 'current' && (
                <Sparkles className="absolute -top-4 left-1/2 h-4 w-4 -translate-x-1/2 text-soft-gold animate-gentle-bounce" />
              )}
              {(() => {
                const bgImage = book.spine_art_url || book.cover_url;
                const spineStyle = bgImage
                  ? {
                      backgroundImage: `linear-gradient(hsl(var(--warm-brown) / 0.22), hsl(var(--warm-brown) / 0.22)), url(${bgImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: 'hsl(var(--muted))',
                      backgroundBlendMode: 'multiply' as const,
                    }
                  : undefined;

                return (
                  <div
                    className={`book-spine ${!bgImage ? spineColors[i % spineColors.length] : ''} ${
                      book.status === 'completed' ? 'opacity-60' : ''
                    } ${book.status === 'upcoming' ? 'shadow-[0_0_12px_hsl(var(--soft-gold)/0.3)]' : ''}`}
                    title={`${book.title} by ${book.author}`}
                    style={spineStyle}
                  >
                    <span
                      className="truncate max-h-32"
                      style={bgImage ? { textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5)', color: 'white', fontWeight: 700 } : undefined}
                    >
                      {book.title}
                    </span>
                  </div>
                );
              })()}
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg whitespace-nowrap font-body">
                  <p className="font-semibold">{book.title}</p>
                  <p className="text-background/70">{book.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Shelf */}
        <div className="mt-1 h-2 rounded-full bg-warm-brown/20" />
      </div>
    </section>
  );
};

export default ReadingJourneyWidget;
