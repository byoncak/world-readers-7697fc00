import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpenCheck, Sparkles, Umbrella, Coffee } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import AttendeeFacePile, { type FacePileProfileInfo } from '@/components/AttendeeFacePile';

type RsvpResponse = 'going' | 'not_going' | 'maybe';

interface RsvpRow {
  user_id: string;
  response: RsvpResponse;
  created_at: string;
}

interface BookMeeting {
  id: string;
  title: string;
  meeting_date: string;
  meeting_location: string | null;
}

const responseConfig: Record<RsvpResponse, { label: string; icon: typeof Sparkles }> = {
  going: { label: 'Going', icon: Sparkles },
  maybe: { label: 'Maybe', icon: Coffee },
  not_going: { label: 'Not Going', icon: Umbrella },
};

const thankYouMessages: Record<RsvpResponse, string> = {
  going: "Yay, see you there! 🎉",
  maybe: "We'll save you a spot! 🤞",
  not_going: "We'll miss you! 💛",
};

type HudPhase = 'loading' | 'expanded' | 'thankyou' | 'compressed' | 'dismissed' | 'hidden';

const DISMISSED_KEY = (userId: string, bookId: string) => `rsvp-hud-dismissed-${userId}-${bookId}`;

// Initial number of profiles to pre-fetch for the face pile (enough for desktop 8 + slack).
const FACEPILE_PREFETCH = 10;

const MeetingRsvpHud = () => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<HudPhase>('loading');
  const [meeting, setMeeting] = useState<BookMeeting | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, FacePileProfileInfo>>(new Map());
  const [myResponse, setMyResponse] = useState<RsvpResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const touchStartX = useRef(0);
  const hudRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

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

  const fetchRsvps = useCallback(async (bookId: string, currentUserId?: string) => {
    // Lightweight rsvp fetch (just ids + response + created_at).
    const { data } = await supabase
      .from('meeting_rsvps')
      .select('user_id, response, created_at')
      .eq('book_id', bookId);

    const rows = (data ?? []) as unknown as RsvpRow[];
    setRsvps(rows);

    // Pre-fetch only the small set of profiles we need for the visible face pile
    // (top N going + self). Full list is lazy-loaded when the attendee modal opens.
    const going = rows
      .filter((r) => r.response === 'going')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => r.user_id);

    const prefetch = new Set<string>(going.slice(0, FACEPILE_PREFETCH));
    if (currentUserId) prefetch.add(currentUserId);

    if (prefetch.size > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(prefetch));
      setProfiles((prev) => {
        const next = new Map(prev);
        (profs ?? []).forEach((p: any) => {
          next.set(p.user_id, {
            display_name: p.display_name ?? null,
            avatar_url: p.avatar_url ?? null,
          });
        });
        return next;
      });
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

      const rows = await fetchRsvps(m.id, user.id);
      if (!isMounted) return;

      const mine = rows.find((r) => r.user_id === user.id);
      if (mine) {
        setMyResponse(mine.response);
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

  // Realtime for rsvps (debounced batch refetch).
  useEffect(() => {
    if (!meeting) return;
    let timer: number | null = null;
    const debouncedRefetch = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        fetchRsvps(meeting.id, user?.id);
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
  }, [meeting?.id, fetchRsvps, user?.id]);

  const handleVote = async (response: RsvpResponse) => {
    if (!user || !meeting) return;
    setSubmitting(true);

    // Optimistic update
    const nowIso = new Date().toISOString();
    const prevRsvps = rsvps;
    const prevMy = myResponse;
    setMyResponse(response);
    setRsvps((rows) => {
      const existing = rows.find((r) => r.user_id === user.id);
      if (existing) {
        return rows.map((r) => r.user_id === user.id ? { ...r, response } : r);
      }
      return [...rows, { user_id: user.id, response, created_at: nowIso }];
    });

    const existing = prevRsvps.find((r) => r.user_id === user.id);
    const { error } = existing
      ? await supabase.from('meeting_rsvps').update({ response, updated_at: nowIso }).eq('book_id', meeting.id).eq('user_id', user.id)
      : await supabase.from('meeting_rsvps').insert({ book_id: meeting.id, user_id: user.id, response });

    if (error) {
      // Rollback
      setRsvps(prevRsvps);
      setMyResponse(prevMy);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setPhase('thankyou');
    setTimeout(async () => {
      await fetchRsvps(meeting.id, user.id);
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

  // Deterministic attendees for the "Going" face pile:
  // 1) current user first if attending, 2) earliest created_at, 3) display_name asc.
  const goingAttendees = useMemo(() => {
    const going = rsvps.filter((r) => r.response === 'going');
    const nameFor = (id: string) => profiles.get(id)?.display_name ?? 'Reader';
    return going
      .slice()
      .sort((a, b) => {
        if (user) {
          if (a.user_id === user.id) return -1;
          if (b.user_id === user.id) return 1;
        }
        const cmp = a.created_at.localeCompare(b.created_at);
        if (cmp !== 0) return cmp;
        return nameFor(a.user_id).localeCompare(nameFor(b.user_id));
      })
      .map((r) => ({ userId: r.user_id, createdAt: r.created_at }));
  }, [rsvps, profiles, user]);

  const handleProfilesLoaded = useCallback((next: Map<string, FacePileProfileInfo>) => {
    setProfiles(next);
  }, []);

  if (phase === 'hidden' || phase === 'dismissed' || phase === 'loading' || !meeting) return null;

  const counts: Record<RsvpResponse, number> = { going: 0, maybe: 0, not_going: 0 };
  rsvps.forEach((r) => { if (counts[r.response] !== undefined) counts[r.response]++; });

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
        <div className="mx-auto max-w-3xl rounded-full border border-border bg-card/95 backdrop-blur-md pl-3 pr-2 py-1.5 shadow-md flex items-center gap-2 sm:gap-3 overflow-hidden">
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

          {/* Going face pile — single accessible target */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {goingAttendees.length > 0 ? (
              <AttendeeFacePile
                attendees={goingAttendees}
                profiles={profiles}
                onProfilesLoaded={handleProfilesLoaded}
                label="going"
                modalTitle="Who's going"
                modalSubtitle={`${meeting.title} · ${format(new Date(meeting.meeting_date), 'EEE, MMM d · h:mm a')}`}
              />
            ) : (
              <span className="text-xs font-body text-muted-foreground">No one going yet</span>
            )}
          </div>

          {/* Compact secondary counts */}
          <div className="hidden xs:flex items-center gap-2 shrink-0 text-[10px] font-body text-muted-foreground">
            {counts.maybe > 0 && (
              <span className="inline-flex items-center gap-1" aria-label={`${counts.maybe} maybe`}>
                <Coffee className="h-3 w-3" />
                {counts.maybe}
              </span>
            )}
            {counts.not_going > 0 && (
              <span className="inline-flex items-center gap-1" aria-label={`${counts.not_going} not going`}>
                <Umbrella className="h-3 w-3" />
                {counts.not_going}
              </span>
            )}
          </div>

          {/* Change vote button */}
          <button
            onClick={() => setPhase('expanded')}
            className="text-[10px] font-body text-primary hover:underline shrink-0 min-h-11 px-2"
          >
            Change
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60 font-body mt-0.5 select-none">
          swipe right to dismiss
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
                {counts[r] > 0 && (
                  <span className="text-[10px] font-normal opacity-80">{counts[r]}</span>
                )}
              </button>
            );
          })}
        </div>

        {goingAttendees.length > 0 && (
          <div className="flex items-center justify-center pt-1">
            <AttendeeFacePile
              attendees={goingAttendees}
              profiles={profiles}
              onProfilesLoaded={handleProfilesLoaded}
              label="going"
              modalTitle="Who's going"
              modalSubtitle={`${meeting.title} · ${format(new Date(meeting.meeting_date), 'EEE, MMM d · h:mm a')}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingRsvpHud;
