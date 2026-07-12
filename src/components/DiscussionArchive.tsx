import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClub } from '@/contexts/ClubContext';
import { ChevronDown } from 'lucide-react';
import StyledName from './StyledName';
import { format, formatDistanceToNow } from 'date-fns';

interface CompletedBook {
  id: string;
  title: string;
  author: string;
  selected_date: string | null;
}

interface Discussion {
  id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: { display_name: string | null } | null;
  replies?: Discussion[];
}

const DiscussionArchive = () => {
  const [books, setBooks] = useState<CompletedBook[]>([]);
  const [discussionsByBook, setDiscussionsByBook] = useState<Record<string, Discussion[]>>({});
  const [loadingBook, setLoadingBook] = useState<string | null>(null);
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  useEffect(() => {
    fetchCompletedBooks();
  }, []);

  const fetchCompletedBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('id, title, author, selected_date')
      .eq('status', 'completed')
      .order('selected_date', { ascending: false });
    if (data) setBooks(data);
  };

  const fetchDiscussionsForBook = async (bookId: string) => {
    if (discussionsByBook[bookId]) return;
    setLoadingBook(bookId);

    const { data } = await supabase
      .from('discussions')
      .select('*, profiles(display_name)')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      const all = data as any as Discussion[];
      const topLevel = all.filter(d => !d.parent_id);
      const replies = all.filter(d => d.parent_id);
      topLevel.forEach(t => {
        t.replies = replies
          .filter(r => r.parent_id === t.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
      setDiscussionsByBook(prev => ({ ...prev, [bookId]: topLevel }));
    }
    setLoadingBook(null);
  };

  const toggleBook = (bookId: string) => {
    if (openBookId === bookId) {
      setOpenBookId(null);
    } else {
      setOpenBookId(bookId);
      fetchDiscussionsForBook(bookId);
    }
  };

  const bubbleColors = ['bubble-peach', 'bubble-sage', 'bubble-lavender', 'bubble-cream'];

  const ReadOnlyBubble = ({ d, isReply = false, colorIndex = 0 }: { d: Discussion; isReply?: boolean; colorIndex?: number }) => (
    <div className={`speech-bubble ${bubbleColors[colorIndex % bubbleColors.length]} ${isReply ? 'ml-6 border-l-2 border-terracotta/20 pl-3' : ''}`}>
      {d.message && <p className="text-sm font-body">{d.message}</p>}
      {d.image_url && (
        <div className="mt-1.5 max-w-xs">
          <img
            src={d.image_url}
            alt="Shared image"
            className="rounded-lg max-h-60 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(d.image_url!, '_blank')}
            loading="lazy"
          />
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <StyledName userId={d.user_id} name={(d.profiles as any)?.display_name || 'Reader'} className="font-semibold" />
        <span className="opacity-60">·</span>
        <span className="opacity-60" title={format(new Date(d.created_at), 'PPP p')}>
          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );

  if (books.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="mb-3 px-2 text-sm font-body tracking-widest uppercase text-muted-foreground/50">Archive</p>

      <div className="space-y-1">
        {books.map((book) => (
          <div key={book.id}>
            <button
              onClick={() => toggleBook(book.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/40 transition-colors"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  openBookId === book.id ? 'rotate-180' : ''
                }`}
              />
              <span className="text-sm font-semibold font-body text-foreground">{book.title}</span>
              <span className="text-xs text-muted-foreground font-body">by {book.author}</span>
            </button>

            {openBookId === book.id && (
              <div className="ml-6 pl-2 border-l border-border">
                {loadingBook === book.id ? (
                  <p className="py-4 text-center text-sm text-muted-foreground font-body">Loading…</p>
                ) : discussionsByBook[book.id]?.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground font-body">
                    No discussions for this book 🍂
                  </p>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto pr-1 py-2">
                    {discussionsByBook[book.id]?.map((d, i) => (
                      <div key={d.id} className="space-y-2">
                        <ReadOnlyBubble d={d} colorIndex={i} />
                        {d.replies?.map((r, ri) => (
                          <ReadOnlyBubble key={r.id} d={r} isReply colorIndex={i + ri + 1} />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscussionArchive;
