import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import {
  BookCheck,
  Quote,
  Star,
  UserPlus,
  Lightbulb,
  Vote,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import UserAvatar from '@/components/UserAvatar';
import StyledName from '@/components/StyledName';
import { useActivityFeed, type ActivityItem } from '@/hooks/useActivityFeed';
import { activityDestination } from '@/lib/activityDestination';
import { useClub } from '@/contexts/ClubContext';
import PollWidget from '@/components/PollWidget';
import ActivityReactions from '@/components/ActivityReactions';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const kindMeta: Record<ActivityItem['kind'], { icon: any; tint: string }> = {
  completion: { icon: BookCheck, tint: 'text-emerald-600' },
  personal_completion: { icon: BookCheck, tint: 'text-emerald-600' },
  quote: { icon: Quote, tint: 'text-violet-600' },
  rating: { icon: Star, tint: 'text-amber-500' },
  join: { icon: UserPlus, tint: 'text-sky-600' },
  suggestion: { icon: Lightbulb, tint: 'text-orange-500' },
  poll: { icon: Vote, tint: 'text-fuchsia-600' },
  announcement: { icon: Megaphone, tint: 'text-rose-600' },
};

const initials = (name?: string) =>
  (name ?? '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function dayBucket(d: string) {
  const date = new Date(d);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ts = date.getTime();
  if (ts >= startOfToday) return 'Today';
  if (ts >= startOfToday - 86_400_000) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ItemBody({ item }: { item: ActivityItem }) {
  const name = item.userId ? (
    <StyledName userId={item.userId} name={item.displayName ?? 'Someone'} className="font-semibold text-foreground" />
  ) : (
    <span className="font-semibold text-foreground">{item.displayName ?? 'Someone'}</span>
  );
  const book = item.bookTitle ? (
    <span className="italic">
      {item.bookTitle}
      {item.bookAuthor ? <span className="not-italic text-muted-foreground"> · {item.bookAuthor}</span> : null}
    </span>
  ) : null;

  switch (item.kind) {
    case 'completion':
      return (
        <p className="text-sm">
          {name} finished the book club read of {book ?? 'the book'}. 📖
        </p>
      );
    case 'personal_completion':
      return (
        <p className="text-sm">
          {name} finished their personal read of {book ?? 'a book'}. 🌱
        </p>
      );
    case 'quote':
      return (
        <div className="space-y-1.5">
          <p className="text-sm">{name} shared a quote{book ? <> from {book}</> : null}.</p>
          {item.isSpoiler ? (
            <p className="text-xs italic text-muted-foreground">Spoiler — open Lounge to read.</p>
          ) : (
            <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/85">
              &ldquo;{item.text}&rdquo;
            </blockquote>
          )}
        </div>
      );
    case 'rating':
      return (
        <div className="space-y-1">
          <p className="text-sm">
            {name} rated {book ?? 'a book'}{' '}
            <span className="text-amber-500">{'★'.repeat(item.rating ?? 0)}</span>
            <span className="text-muted-foreground/50">{'★'.repeat(Math.max(0, 5 - (item.rating ?? 0)))}</span>
          </p>
          {item.text ? <p className="text-sm text-foreground/80">{item.text}</p> : null}
        </div>
      );
    case 'join':
      return <p className="text-sm">{name} joined the club. 👋</p>;
    case 'suggestion':
      return (
        <p className="text-sm">
          {name} suggested {book ?? <span className="italic">a book</span>}.
        </p>
      );
    case 'poll':
      return (
        <p className="text-sm">
          <span className="font-semibold text-foreground">New poll:</span> {item.text}
        </p>
      );
    case 'announcement':
      return (
        <p className="text-sm">
          <span className="font-semibold text-foreground">Announcement:</span> {item.text}
        </p>
      );
  }
}

function Row({ item, clubPath }: { item: ActivityItem; clubPath: (p?: string) => string }) {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  const to = activityDestination(item, clubPath);
  const inner = (
    <article className="flex gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 transition-colors hover:bg-card">
      {item.userId ? (
        <UserAvatar
          userId={item.userId}
          avatarUrl={item.avatarUrl ?? null}
          displayName={item.displayName ?? null}
          size="sm"
        />
      ) : (
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={meta.tint}>
            <Icon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {item.userId ? <Icon className={`h-3.5 w-3.5 ${meta.tint}`} /> : null}
          <time className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </time>
        </div>
        <ItemBody item={item} />
        <div
          className="pt-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <ActivityReactions activityId={item.id} />
        </div>
      </div>
    </article>
  );
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

const Activity = () => {
  const { data, isLoading, isError } = useActivityFeed();
  const { clubPath } = useClub();
  const [searchParams] = useSearchParams();
  const [pollSheetOpen, setPollSheetOpen] = useState(false);
  const [activePollCount, setActivePollCount] = useState(0);

  useEffect(() => {
    const fetchActivePolls = async () => {
      const { count, error } = await supabase
        .from('polls')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);
      if (!error) setActivePollCount(count || 0);
    };
    fetchActivePolls();
  }, []);

  useEffect(() => {
    if (searchParams.get('poll') === 'open') {
      setPollSheetOpen(true);
    }
  }, [searchParams]);

  const grouped = (data ?? []).reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const k = dayBucket(item.createdAt);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
  const orderedBuckets = Object.keys(grouped);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6 animate-page-in">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-serif text-2xl">Activity</h1>
        </div>
        {activePollCount > 0 && (
          <button
            onClick={() => setPollSheetOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            VOTE IS LIVE
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="book"><div/><div/><div/><div/><div/></div>
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Couldn&rsquo;t load activity. Pull down to retry.</p>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">Quiet day. Check back soon. 🪱</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedBuckets.map((bucket) => (
            <section key={bucket} className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {bucket}
              </h2>
              <div className="space-y-2">
                {grouped[bucket].map((item) => (
                  <Row key={item.id} item={item} clubPath={clubPath} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet open={pollSheetOpen} onOpenChange={setPollSheetOpen}>
        <SheetContent side="bottom" className="h-[85dvh] flex flex-col rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-5 pb-2">
            <SheetTitle className="font-serif">Active Polls</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <PollWidget />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default Activity;