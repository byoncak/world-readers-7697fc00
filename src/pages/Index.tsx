import { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Apple, Send } from 'lucide-react';
import CurrentBookWidget from '@/components/CurrentBookWidget';
import NextMeetupWidget from '@/components/NextMeetupWidget';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';

// Lazy-load below-the-fold widgets so the initial Home bundle is smaller.
const BookWishlistWidget = lazy(() => import('@/components/BookWishlistWidget'));
const ReadingJourneyWidget = lazy(() => import('@/components/ReadingJourneyWidget'));

const WidgetFallback = () => (
  <div className="flex items-center justify-center py-10">
    <div className="book"><div/><div/><div/><div/><div/></div>
  </div>
);

const buildShortcuts = (clubPath: (p?: string) => string) => [
  {
    to: clubPath('/shop'),
    icon: Apple,
    label: 'Shop',
    colorClass: 'bg-[hsl(var(--sage))] text-[hsl(var(--secondary-foreground))] hover:shadow-[0_8px_24px_-4px_hsl(var(--sage)/0.5)]',
    borderClass: 'border-[hsl(var(--sage)/0.5)]',
  },
  {
    to: clubPath('/inbox'),
    icon: Send,
    label: 'Messages',
    colorClass: 'bg-[hsl(var(--cream))] text-[hsl(var(--warm-brown))] hover:shadow-[0_8px_24px_-4px_hsl(var(--soft-gold)/0.4)]',
    borderClass: 'border-[hsl(var(--soft-gold)/0.4)]',
  },
];

const Index = () => {
  const { user } = useAuth();
  const { clubId, clubPath } = useClub();
  const shortcutItems = buildShortcuts(clubPath);
  const [showLivePoll, setShowLivePoll] = useState(false);

  useEffect(() => {
    // Poll indicator must be strictly scoped to the current club — otherwise
    // Home lights up for a poll in a sibling club the user also belongs to.
    setShowLivePoll(false);
    const checkLivePoll = async () => {
      if (!user || !clubId) return;
      const { data: pollData } = await supabase
        .from('polls')
        .select('id')
        .eq('active', true)
        .eq('club_id', clubId);
      if (!pollData || pollData.length === 0) {
        setShowLivePoll(false);
        return;
      }
      const pollIds = pollData.map((p) => p.id);
      const { data: voteData } = await supabase
        .from('poll_votes')
        .select('poll_id')
        .in('poll_id', pollIds)
        .eq('user_id', user.id);
      const hasVotedAll = pollData.length > 0 && voteData && voteData.length >= pollData.length;
      setShowLivePoll(!hasVotedAll);
    };
    checkLivePoll();
  }, [user, clubId]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20 sm:pb-6 space-y-12 animate-page-in">
      {/* Hero: current book + your progress */}
      <CurrentBookWidget />

      <nav aria-label="Quick shortcuts" className="flex items-start justify-center gap-8 px-2">
        {shortcutItems.map(({ to, icon: Icon, label, colorClass, borderClass }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className="group flex flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${borderClass} ${colorClass} shadow-[0_4px_16px_-4px_hsl(var(--warm-brown)/0.12)] transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105`}
            >
              <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            </span>
            <span className="text-xs font-body font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {label}
            </span>
          </Link>
        ))}
        {showLivePoll && (
          <Link
            to={clubPath('/activity?poll=open')}
            aria-label="Live poll — open to vote"
            className="group flex flex-col items-center gap-1.5"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 shadow-[0_4px_16px_-4px_hsl(var(--warm-brown)/0.12)] transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:bg-red-500/20">
              <span className="relative flex h-3 w-3" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
            </span>
            <span className="text-xs font-body font-medium text-red-600">Live poll</span>
          </Link>
        )}
      </nav>

      {/* Secondary sections — quieter, more whitespace */}
      <NextMeetupWidget />

      <Suspense fallback={<WidgetFallback />}>
        <BookWishlistWidget />
      </Suspense>

      <Suspense fallback={<WidgetFallback />}>
        <ReadingJourneyWidget />
      </Suspense>
    </main>
  );
};

export default Index;
