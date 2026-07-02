import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { useEquippedCosmetics, prefetchEquippedCosmetics } from '@/hooks/useEquippedCosmetics';
import { BookOpen, Calendar, Sparkles, Trophy, Pencil, FileText } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
import CheerDialog from '@/components/CheerDialog';
import StyledName from '@/components/StyledName';
import { celebrateFromElement } from '@/lib/celebrate';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  total_pages: number | null;
  meeting_date: string | null;
  pdf_url?: string | null;
}

interface Progress {
  user_id: string;
  current_page: number;
  display_name: string | null;
  last_updated: string | null;
  progress_bar_class?: string;
}

const CurrentBookWidget = () => {
  const { user } = useAuth();
  const cosmetics = useEquippedCosmetics(user?.id);
  const equippedBarClass = cosmetics?.progressBarClass || '';
  const [book, setBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [myPage, setMyPage] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [barCelebrating, setBarCelebrating] = useState(false);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const myBarRef = useRef<HTMLDivElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Cheer state
  const [cheeredToday, setCheeredToday] = useState<Set<string>>(new Set());
  const [cheerTarget, setCheerTarget] = useState<{ userId: string; name: string } | null>(null);

  useEffect(() => {
    fetchCurrentBook();

    // Best-effort local reset for self-cheer testing across page navigation
    const resetAt = Number(localStorage.getItem('selfCheerResetAt') || '0');
    if (resetAt && user) {
      setCheeredToday((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  }, []);

  useEffect(() => () => {
    clearTimeout(savedTimerRef.current);
    clearTimeout(celebrateTimerRef.current);
  }, []);

  const fetchCurrentBook = async () => {
    const { data: books } = await supabase
      .from('books')
      .select('*')
      .eq('status', 'current')
      .limit(1);

    if (books && books.length > 0) {
      setBook(books[0]);
      // Run progress + cheers in parallel
      const tasks: Promise<unknown>[] = [fetchProgress(books[0].id)];
      if (user) tasks.push(fetchTodayCheers(books[0].id));
      void Promise.all(tasks);
    }
  };

  const fetchProgress = async (bookId: string) => {
    const { data } = await supabase
      .from('reading_progress')
      .select('user_id, current_page, last_updated')
      .eq('book_id', bookId);

    if (data && data.length > 0) {
      const userIds = data.map((p: any) => p.user_id);

      // Fetch profiles + inventory in parallel; warm StyledName cache from inventory
      const [{ data: profiles }, { data: inventory }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds),
        supabase
          .from('user_inventory')
          .select('user_id, selected_variant, shop_items(category, asset_data)')
          .in('user_id', userIds)
          .eq('equipped', true),
      ]);

      // Warm the equipped-cosmetics cache so each <StyledName> render
      // doesn't fire its own query for these users.
      prefetchEquippedCosmetics(userIds, (inventory as any[]) ?? []);

      const progressBarMap = new Map<string, string>();
      ((inventory as any[]) ?? []).forEach((item) => {
        const shopItem = item.shop_items;
        if (shopItem?.category === 'progress_bar' && shopItem.asset_data?.bar_class) {
          progressBarMap.set(item.user_id, shopItem.asset_data.bar_class);
        }
      });

      const merged = data.map((p: any) => ({
        user_id: p.user_id,
        current_page: p.current_page,
        display_name: profiles?.find((pr: any) => pr.user_id === p.user_id)?.display_name || null,
        last_updated: p.last_updated || null,
        progress_bar_class: progressBarMap.get(p.user_id),
      }));

      setProgress(merged);
      const mine = merged.find((p: any) => p.user_id === user?.id);
      if (mine) setMyPage(mine.current_page);
    } else {
      setProgress([]);
    }
  };

  const fetchTodayCheers = async (bookId: string) => {
    if (!user) return;
    const todayStart = startOfDay(new Date()).toISOString();
    const resetAt = Number(localStorage.getItem('selfCheerResetAt') || '0');

    const { data } = await supabase
      .from('cheers')
      .select('to_user_id, created_at')
      .eq('from_user_id', user.id)
      .eq('book_id', bookId)
      .gte('created_at', todayStart);

    if (data) {
      const filtered = data.filter((c: any) => {
        if (c.to_user_id !== user.id || !resetAt) return true;
        return new Date(c.created_at).getTime() >= resetAt;
      });

      setCheeredToday(new Set(filtered.map((c: any) => c.to_user_id)));
    }
  };

  const updateProgress = async () => {
    if (!book || !user) return;
    setUpdating(true);
    const newPage = myPage;
    const total = book.total_pages || 1;
    const prevPage = progress.find((p) => p.user_id === user.id)?.current_page ?? 0;
    const pagesGained = newPage - prevPage;
    const nowComplete = prevPage < total && newPage >= total;
    await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        book_id: book.id,
        current_page: newPage,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id,book_id' });

    // Optimistically update local list instead of refetching everyone.
    const nowIso = new Date().toISOString();
    setProgress((prev) => {
      const exists = prev.some((p) => p.user_id === user.id);
      if (exists) {
        return prev.map((p) =>
          p.user_id === user.id
            ? { ...p, current_page: newPage, last_updated: nowIso }
            : p
        );
      }
      return [
        ...prev,
        {
          user_id: user.id,
          current_page: newPage,
          display_name: null,
          last_updated: nowIso,
        },
      ];
    });
    setUpdating(false);

    // ── Celebrate the update ──
    setJustSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setJustSaved(false), 1800);

    if (pagesGained > 0 || nowComplete) {
      setBarCelebrating(true);
      clearTimeout(celebrateTimerRef.current);
      celebrateTimerRef.current = setTimeout(() => setBarCelebrating(false), 1300);
    }

    if (nowComplete) {
      // Finishing the book deserves a real send-off. 🎉
      setTimeout(() => {
        celebrateFromElement(myBarRef.current, { count: 44, power: 190, emojis: ['🎉', '📚', '✨', '🏆'] });
      }, 350);
    }
  };

  if (!book) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12">
        <Sparkles className="mb-3 h-10 w-10 text-soft-gold animate-gentle-bounce" />
        <h2 className="cozy-title text-2xl">No current book yet!</h2>
        <p className="cozy-subtitle mt-1">Time to pick your next adventure ✨</p>
      </div>
    );
  }

  const totalPages = book.total_pages || 1;
  const daysLeft = book.meeting_date
    ? differenceInCalendarDays(new Date(book.meeting_date), new Date())
    : null;
  const isCheerTime = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  return (
    <div className="col-span-full p-4">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Book Cover */}
        <div className="flex flex-shrink-0 flex-col items-start gap-2">
          <div className="relative h-72 w-52 md:h-64 md:w-44">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="h-full w-full rounded-xl object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-peach shadow-lg">
                <BookOpen className="h-16 w-16 text-terracotta" />
              </div>
            )}
            {book.pdf_url && (
              <a
                href={book.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-lg bg-terracotta px-2.5 py-1 text-xs font-body font-semibold text-primary-foreground shadow-lg shadow-black/30 hover:brightness-110 transition whitespace-nowrap"
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </a>
            )}
          </div>
        </div>

        {/* Book Info */}
        <div className="flex-1">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground not-italic leading-tight" style={{ fontStyle: 'normal' }}>{book.title}</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground/70">by {book.author}</p>

          {book.meeting_date && (() => {
            const days = Math.ceil(
              (new Date(book.meeting_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (days < 0 || days > 5) return null;
            return (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 text-terracotta" />
                <span className="font-body">
                  Meeting: {format(new Date(book.meeting_date), 'MMMM d, yyyy')}
                </span>
              </div>
            );
          })()}

          {/* My Progress */}
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold font-body">Your progress</span>
              {myPage >= totalPages ? (
                <span className="cozy-badge cozy-badge-sage flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> Complete! 🎉
                </span>
              ) : (
                <span className="cozy-badge cozy-badge-sage">
                  {Math.round((myPage / totalPages) * 100)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Slider
                min={0}
                max={totalPages}
                step={1}
                value={[myPage]}
                onValueChange={(val) => setMyPage(val[0])}
                className="flex-1"
              />
              {editingPage ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = Math.max(0, Math.min(totalPages, parseInt(pageInput) || 0));
                    setMyPage(val);
                    setEditingPage(false);
                  }}
                  className="min-w-[60px]"
                >
                  <input
                    ref={inputRef}
                    type="number"
                    min={0}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => {
                      const val = Math.max(0, Math.min(totalPages, parseInt(pageInput) || 0));
                      setMyPage(val);
                      setEditingPage(false);
                    }}
                    className="w-[78px] rounded-lg border-2 border-terracotta bg-background px-2 py-1 text-center text-sm font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                    autoFocus
                  />
                </form>
              ) : (
                <button
                  onClick={() => {
                    setPageInput(String(myPage));
                    setEditingPage(true);
                  }}
                  className="inline-flex min-w-[78px] items-center justify-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1 text-sm font-semibold text-foreground font-body hover:border-terracotta hover:bg-muted cursor-pointer transition-colors"
                  title="Tap to type a page number"
                >
                  <span className="text-terracotta">{myPage}</span>
                  <span className="text-muted-foreground">/{totalPages}</span>
                  <Pencil className="h-3 w-3 text-muted-foreground/70" />
                </button>
              )}
              <button
                onClick={updateProgress}
                disabled={updating || justSaved}
                className={`text-sm transition-all duration-300 ${
                  justSaved
                    ? 'cozy-btn animate-saved-nudge bg-sage text-secondary-foreground'
                    : 'cozy-btn-primary'
                }`}
              >
                {updating ? '...' : justSaved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </div>

          {/* Member Progress */}
          <div className="mt-5 space-y-2 border-t border-border/50 pt-4">
            {[...progress].sort((a, b) => {
              const aComplete = a.current_page >= totalPages;
              const bComplete = b.current_page >= totalPages;
              if (aComplete && bComplete) {
                return (a.last_updated || '').localeCompare(b.last_updated || '');
              }
              if (aComplete) return -1;
              if (bComplete) return 1;
              return b.current_page - a.current_page;
            }).map((p) => {
              const isComplete = p.current_page >= totalPages;
              const isMe = p.user_id === user?.id;
              const selfCheerEnabled = localStorage.getItem('selfCheerEnabled') === 'true';
              const canCheer = isCheerTime && !isComplete && (!isMe || selfCheerEnabled);
              const alreadyCheered = cheeredToday.has(p.user_id);

              return (
                <div key={p.user_id} className="flex items-center gap-3">
                  <span className="w-24 truncate text-xs font-body text-muted-foreground">
                    <StyledName userId={p.user_id} name={p.display_name || 'Reader'} />
                  </span>
                  <div
                    ref={isMe ? myBarRef : undefined}
                    className={`progress-bar-watercolor flex-1 ${isComplete ? 'outline outline-2 outline-soft-gold outline-offset-[1px] rounded-full' : ''} ${p.progress_bar_class || (isMe ? equippedBarClass : '')} ${isMe && barCelebrating ? 'bar-celebrate' : ''}`}
                  >
                    <div
                      className="fill"
                      style={{ width: `${Math.min((p.current_page / totalPages) * 100, 100)}%` }}
                    />
                  </div>
                  {isComplete ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-soft-gold font-body">
                      <Trophy className="h-3 w-3" /> Done!
                    </span>
                  ) : canCheer ? (
                    alreadyCheered ? (
                      <span className="text-xs text-muted-foreground font-body whitespace-nowrap">
                        Cheered! 🎉
                      </span>
                    ) : (
                      <button
                        onClick={() => setCheerTarget({ userId: p.user_id, name: p.display_name || 'Reader' })}
                        className="animate-cheer-pulse text-xs font-semibold text-soft-gold font-body whitespace-nowrap cursor-pointer hover:text-terracotta transition-colors"
                      >
                        👏 Cheer them on! 👏
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground font-body">
                      p.{p.current_page}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cheer Dialog */}
      {cheerTarget && book && (
        <CheerDialog
          open={!!cheerTarget}
          onOpenChange={(open) => { if (!open) setCheerTarget(null); }}
          targetUserId={cheerTarget.userId}
          targetName={cheerTarget.name}
          bookId={book.id}
          onCheerSent={() => {
            setCheeredToday((prev) => new Set([...prev, cheerTarget.userId]));
            setCheerTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default CurrentBookWidget;
