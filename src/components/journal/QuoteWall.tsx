import { useState } from 'react';
import { Plus } from 'lucide-react';
import QuoteComposerDialog from '@/components/quotes/QuoteComposerDialog';
import QuotePoster from '@/components/quotes/QuotePoster';
import { useAllQuotes } from '@/hooks/useAllQuotes';
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/StateBlock';
import MobileFab from '@/components/MobileFab';

const QuoteWall = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  const { data: quotes = [], isLoading, isError, refetch } = useAllQuotes();

  return (
    <div className="mobile-fab-content-offset space-y-4 pt-2">
      {isLoading ? (
        <LoadingBlock label="Loading quotes…" rows={4} />
      ) : isError ? (
        <ErrorBlock message="Couldn't fetch the quote wall." onRetry={() => refetch()} />
      ) : quotes.length === 0 ? (
        <EmptyBlock message="No quotes yet — be the first to share! ✨" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => (
            <div key={quote.id} className="aspect-[4/5] min-h-[260px]">
              <QuotePoster quote={quote} />
            </div>
          ))}
        </div>
      )}

      <MobileFab
        onClick={() => setComposerOpen(true)}
        title="New quote"
        label="Add a new quote"
        hidden={composerOpen}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </MobileFab>

      <QuoteComposerDialog open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
};

export default QuoteWall;
