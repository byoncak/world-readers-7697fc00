import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpenCheck, Sparkles, Umbrella, Coffee } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserAvatar from '@/components/UserAvatar';
import StyledName from '@/components/StyledName';

type RsvpResponse = 'going' | 'not_going' | 'maybe';

interface RsvpRow {
  user_id: string;
  response: RsvpResponse;
}

interface ProfileInfo {
  display_name: string | null;
  avatar_url: string | null;
}

interface BookMeeting {
  id: string;
  title: string;
  meeting_date: string;
  meeting_location: string | null;
}

const responseConfig: Record<RsvpResponse, { label: string; icon: typeof Sparkles; borderClass: string }> = {
  going: { label: 'Going', icon: Sparkles, borderClass: 'border-secondary' },
  maybe: { label: 'Maybe', icon: Coffee, borderClass: 'border-soft-gold' },
  not_going: { label: 'Not Going', icon: Umbrella, borderClass: 'border-destructive/40' },
};

const thankYouMessages: Record<RsvpResponse, string> = {
  going: "Yay, see you there! 🎉",
  maybe: "We'll save you a spot! 🤞",
  not_going: "We'll miss you! 💛",
};

type HudPhase = 'loading' | 'expanded' | 'thankyou' | 'compressed' | 'dismissed' | 'hidden';

const DISMISSED_KEY = (userId: string, bookId: string) => `rsvp-hud-dismissed-${userId}-${bookId}`;

const MeetingRsvpHud = () => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<HudPhase>('loading');
  const [meeting, setMeeting] = useState<BookMeeting | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [myResponse, setMyResponse] = useState<RsvpResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Swipe state (horizontal)
  const touchStartX = useRef(0);
  const hudRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchMeeting = useCallback(async () => {
    const { data } = await supabase
      .from('books')
      .select('id, title, meeting_date, meeting_location, meeting_rsvp_active')
      .eq('status', 'current')
      .eq('meeting_rsvp_active', true)
      .not('meeting_date', 'is', null)
      .limit(1)
      .single();

    if (data) {
      setMeeting(data as BookMeeting);
      return data as BookMeeting;
    }
    setMeeting(null);
    setPhase('hidden');
    return null;
  }, []);

  const fetchRsvps = useCallback(async (bookId: string) => {
    const { data } = await supabase
      .from('meeting_rsvps')
      .select('user_id, response')
      .eq('book_id', bookId);

    const rows = (data ?? []) as unknown as RsvpRow[];
    setRsvps(rows);

    const userIds = rows.map((r) => r.user_id);
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      setProfiles(new Map((profs ?? []).map((p: any) => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }])));
    } else {
      setProfiles(new Map());
    }

    return rows;
  }, []);

  useEffect(() => {
    if (!user) { setPhase('hidden'); return; }

    let isMounted = true;

    const init = async () => {
      const m = await fetchMeeting();
      if (!isMounted) return;

      if (!m) {
        setMyResponse(null);
        setRsvps([]);
        return;
      }

      const dismissedKey = DISMISSED_KEY(user.id, m.id);
      if (localStorage.getItem(dismissedKey)) {
        setPhase('dismissed');
        return;
      }

      const rows = await fetchRsvps(m.id);
      if (!isMounted) return;

      const mine = rows.find((r) => r.user_id === user.id);
      if (mine) {
        setMyResponse(mine.response);
        // Don't override if user manually expanded via "Change" button
        setPhase((prev) => prev === 'expanded' ? 'expanded' : 'compressed');
      } else {
        setMyResponse(null);
        setPhase('expanded');
      }
    };

    init();

    const booksChannel = supabase
      .channel('rsvp-hud-books-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'books' }, init)
      .subscribe();

    const handlePollChanged = () => init();
    const handleFocus = () => init();
    const handleVisibilityChange = () => {
      if (!document.hidden) init();
    };

    window.addEventListener('meeting-rsvp-poll-changed', handlePollChanged);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      supabase.removeChannel(booksChannel);
      window.removeEventListener('meeting-rsvp-poll-changed', handlePollChanged);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchMeeting, fetchRsvps]);

  // Realtime for rsvps
  useEffect(() => {
    if (!meeting) return;
    let timer: number | null = null;
    const debouncedRefetch = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        fetchRsvps(meeting.id);
      }, 300);
    };
    const channel = supabase
      .channel('rsvp-hud-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_rsvps', filter: `book_id=eq.${meeting.id}` }, debouncedRefetch)
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [meeting?.id, fetchRsvps]);

  const handleVote = async (response: RsvpResponse) => {
    if (!user || !meeting) return;
    setSubmitting(true);

    const existing = rsvps.find((r) => r.user_id === user.id);
    if (existing) {
      await supabase.from('meeting_rsvps').update({ response, updated_at: new Date().toISOString() }).eq('book_id', meeting.id).eq('user_id', user.id);
    } else {
      await supabase.from('meeting_rsvps').insert({ book_id: meeting.id, user_id: user.id, response });
    }

    setMyResponse(response);
    setSubmitting(false);

    setPhase('thankyou');
    setTimeout(async () => {
      await fetchRsvps(meeting.id);
      setPhase('compressed');
    }, 2500);
  };

  // Swipe handling — horizontal (right to dismiss)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    if (delta > 0) setSwipeOffset(Math.min(delta, 200));
  };
  const onTouchEnd = () => {
    if (swipeOffset > 80 && user && meeting) {
      setPhase('dismissed');
      localStorage.setItem(DISMISSED_KEY(user.id, meeting.id), 'true');
    }
    setSwipeOffset(0);
  };

  if (phase === 'hidden' || phase === 'dismissed' || phase === 'loading' || !meeting) return null;

  const counts: Record<RsvpResponse, RsvpRow[]> = { going: [], maybe: [], not_going: [] };
  rsvps.forEach((r) => { if (counts[r.response]) counts[r.response].push(r); });

  const responseOrder: RsvpResponse[] = ['going', 'maybe', 'not_going'];

  // --- THANK YOU PHASE ---
  if (phase === 'thankyou' && myResponse) {
    const Icon = responseConfig[myResponse].icon;
    return (
      <div className="sticky top-0 z-50 px-3 pt-2 pb-1 animate-fade-in">
      <div className="mx-auto max-w-3xl rounded-2xl border border-secondary bg-card px-5 py-3 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <Icon className="h-4 w-4 text-terracotta animate-wiggle shrink-0" />
            <span className="font-display text-sm font-bold text-foreground whitespace-nowrap">
              {thankYouMessages[myResponse]}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- COMPRESSED PHASE ---
  if (phase === 'compressed') {
    return (
      <div
        ref={hudRef}
        className="sticky top-0 z-50 px-3 pt-2 pb-1 transition-all duration-300"
        style={{
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
          opacity: swipeOffset > 60 ? 0.3 : 1,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto max-w-3xl rounded-full border border-border bg-card/95 backdrop-blur-md px-4 py-2 shadow-md flex items-center gap-3 overflow-hidden">
          <BookOpenCheck className="h-4 w-4 text-terracotta shrink-0" />
          <span className="text-xs font-serif font-semibold text-foreground truncate shrink-0">
            {format(new Date(meeting.meeting_date), 'MMM d')}
          </span>
          {(() => {
            const days = differenceInCalendarDays(new Date(meeting.meeting_date), new Date());
            if (days < 0) return null;
            return (
              <span className="shrink-0 text-[10px] font-body font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                {days === 0 ? 'Today!' : days === 1 ? '1 day' : `${days} days`}
              </span>
            );
          })()}
          <div className="h-4 w-px bg-border shrink-0" />

          {/* Avatar groups — clickable to expand detail */}
          <div
            className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 cursor-pointer"
            onClick={() => setDetailOpen((v) => !v)}
          >
            {responseOrder.map((r) => {
              const group = counts[r];
              if (group.length === 0) return null;
              const Icon = responseConfig[r].icon;
              return (
                <div key={r} className="flex items-center gap-1 shrink-0">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <div className="flex -space-x-1.5">
                    {group.slice(0, 5).map((rv) => {
                      const prof = profiles.get(rv.user_id);
                      return (
                        <UserAvatar
                          key={rv.user_id}
                          userId={rv.user_id}
                          avatarUrl={prof?.avatar_url ?? null}
                          displayName={prof?.display_name ?? null}
                          size="sm"
                          className="!h-6 !w-6 !text-[9px]"
                          linkToProfile={false}
                        />
                      );
                    })}
                    {group.length > 5 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-muted text-[9px] font-body font-bold text-muted-foreground">
                        +{group.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Change vote button */}
          <button
            onClick={() => setPhase('expanded')}
            className="text-[10px] font-body text-primary hover:underline shrink-0"
          >
            Change
          </button>
        </div>

        {/* Expandable detail panel */}
        {detailOpen && (
          <div className="mx-auto max-w-3xl mt-1 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-lg animate-fade-in space-y-2.5">
            {responseOrder.map((r) => {
              const group = counts[r];
              if (group.length === 0) return null;
              const Icon = responseConfig[r].icon;
              return (
                <div key={r}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-body font-semibold text-foreground">
                      {responseConfig[r].label} ({group.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.map((rv) => {
                      const prof = profiles.get(rv.user_id);
                      const name = prof?.display_name ?? 'Reader';
                      return (
                        <div key={rv.user_id} className="flex items-center gap-1.5">
                          <UserAvatar
                            userId={rv.user_id}
                            avatarUrl={prof?.avatar_url ?? null}
                            displayName={prof?.display_name ?? null}
                            size="sm"
                            className="!h-6 !w-6 !text-[9px]"
                          />
                          <StyledName userId={rv.user_id} name={name} className="text-[11px] font-body text-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/60 font-body mt-0.5 select-none">
          {detailOpen ? 'tap avatars to collapse' : 'swipe right to dismiss'}
        </p>
      </div>
    );
  }

  // --- EXPANDED PHASE ---
  return (
    <div className="sticky top-0 z-50 px-3 pt-2 pb-1 animate-fade-in">
      <div className="rsvp-shimmer mx-auto max-w-3xl rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-terracotta" />
            <h3 className="font-display text-base font-bold text-foreground">Are you joining?</h3>
          </div>
          <span className="text-xs text-muted-foreground font-body">
            {format(new Date(meeting.meeting_date), 'EEE, MMM d · h:mm a')}
          </span>
        </div>

        <p className="text-xs text-muted-foreground font-body">
          <strong className="font-serif text-foreground">{meeting.title}</strong> meetup
          {meeting.meeting_location && <span> · 📍 {meeting.meeting_location}</span>}
        </p>

        <div className="flex gap-2">
          {responseOrder.map((r) => {
            const isSelected = myResponse === r;
            const Icon = responseConfig[r].icon;
            return (
              <button
                key={r}
                onClick={() => handleVote(r)}
                disabled={submitting}
                className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-body font-semibold transition-all duration-200 disabled:opacity-50 ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm scale-[1.03]'
                    : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:border-primary/30'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{responseConfig[r].label}</span>
              </button>
            );
          })}
        </div>

        {rsvps.length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground font-body">
            {rsvps.length} {rsvps.length === 1 ? 'person has' : 'people have'} responded
          </p>
        )}
      </div>
    </div>
  );
};

export default MeetingRsvpHud;
