import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuoteComposerDialog from '@/components/quotes/QuoteComposerDialog';
import QuotePoster from '@/components/quotes/QuotePoster';
import { useAllQuotes } from '@/hooks/useAllQuotes';

const QuoteWall = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  const { data: quotes = [], isLoading } = useAllQuotes();

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 pt-2">
      {quotes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground font-body">
          No quotes yet — be the first to share! ✨
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => (
            <div key={quote.id} className="aspect-[4/5] min-h-[260px]">
              <QuotePoster quote={quote} />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        title="New quote"
      >
        <Plus className="h-6 w-6" />
      </button>

      <QuoteComposerDialog open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
};

export default QuoteWall;