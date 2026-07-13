import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { BookOpenCheck, Check, X, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import AttendeeFacePile, { type FacePileProfileInfo } from '@/components/AttendeeFacePile';

type RsvpResponse = 'going' | 'not_going' | 'maybe';

interface RsvpRow {
  id: string;
  book_id: string;
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

const responseConfig: Record<RsvpResponse, { label: string; emoji: string; color: string; icon: typeof Check }> = {
  going: { label: 'Going', emoji: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700', icon: Check },
  maybe: { label: 'Maybe', emoji: '🤔', color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700', icon: HelpCircle },
  not_going: { label: 'Not Going', emoji: '❌', color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700', icon: X },
};

const FACEPILE_PREFETCH = 10;

const MeetingRsvpWidget = () => {
  const { user } = useAuth();
  const { clubId } = useClub();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<BookMeeting | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [myResponse, setMyResponse] = useState<RsvpResponse | null>(null);
  const [profiles, setProfiles] = useState<Map<string, FacePileProfileInfo>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const fetchMeeting = async () => {
    if (!clubId) { setMeeting(null); return null; }
    const { data } = await supabase
      .from('books')
      .select('id, title, meeting_date, meeting_location')
      .eq('status', 'current')
      .eq('club_id', clubId)
      .not('meeting_date', 'is', null)
      .limit(1)
      .maybeSingle();

    if (data) setMeeting(data as BookMeeting);
    else setMeeting(null);
    return data as BookMeeting | null;
  };

  const fetchRsvps = async (bookId: string) => {
    const { data } = await supabase
      .from('meeting_rsvps')
      .select('id, book_id, user_id, response, created_at')
      .eq('book_id', bookId);

    const rows = (data ?? []) as unknown as RsvpRow[];
    setRsvps(rows);

    if (user) {
      const mine = rows.find((r) => r.user_id === user.id);
      setMyResponse(mine?.response ?? null);
    }

    // Only prefetch face-pile profiles (top N going + self). Full list is loaded when the modal opens.
    const going = rows
      .filter((r) => r.response === 'going')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => r.user_id);
    const prefetch = new Set<string>(going.slice(0, FACEPILE_PREFETCH));
    if (user) prefetch.add(user.id);

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
  };

  useEffect(() => {
    setMeeting(null);
    setRsvps([]);
    setMyResponse(null);
    setProfiles(new Map());
    const init = async () => {
      const m = await fetchMeeting();
      if (m) fetchRsvps(m.id);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, clubId]);

  useEffect(() => {
    if (!meeting) return;
    const channel = supabase
      .channel('rsvp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_rsvps', filter: `book_id=eq.${meeting.id}` }, () => fetchRsvps(meeting.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting?.id]);

  const handleVote = async (response: RsvpResponse) => {
    if (!user || !meeting) return;
    setSubmitting(true);

    const prevRsvps = rsvps;
    const prevMy = myResponse;
    const nowIso = new Date().toISOString();

    // Optimistic
    if (myResponse === response) {
      setRsvps((rows) => rows.filter((r) => r.user_id !== user.id));
      setMyResponse(null);
    } else {
      setMyResponse(response);
      setRsvps((rows) => {
        const existing = rows.find((r) => r.user_id === user.id);
        if (existing) return rows.map((r) => r.user_id === user.id ? { ...r, response } : r);
        return [...rows, { id: `optimistic-${user.id}`, book_id: meeting.id, user_id: user.id, response, created_at: nowIso }];
      });
    }

    let error: unknown = null;
    if (prevMy === response) {
      const res = await supabase.from('meeting_rsvps').delete().eq('book_id', meeting.id).eq('user_id', user.id);
      error = res.error;
    } else {
      const existing = prevRsvps.find((r) => r.user_id === user.id);
      if (existing) {
        const res = await supabase.from('meeting_rsvps').update({ response, updated_at: nowIso }).eq('id', existing.id);
        error = res.error;
      } else {
        const res = await supabase.from('meeting_rsvps').insert({ book_id: meeting.id, user_id: user.id, response, club_id: clubId } as any);
        error = res.error;
      }
    }

    if (error) {
      // Rollback
      setRsvps(prevRsvps);
      setMyResponse(prevMy);
      toast({ title: 'Could not save your response.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    if (prevMy !== response) {
      toast({ title: `${responseConfig[response].emoji} You're ${responseConfig[response].label.toLowerCase()}!` });
    }

    await fetchRsvps(meeting.id);
    setSubmitting(false);
  };

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

  if (!meeting) return null;

  const counts: Record<RsvpResponse, number> = { going: 0, maybe: 0, not_going: 0 };
  rsvps.forEach((r) => { if (counts[r.response] !== undefined) counts[r.response]++; });
  const total = rsvps.length;

  const responseOrder: RsvpResponse[] = ['going', 'maybe', 'not_going'];

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-terracotta" />
          <h3 className="font-serif font-semibold text-sm">Meeting RSVP</h3>
        </div>
        <span className="text-xs text-muted-foreground font-body">
          {format(new Date(meeting.meeting_date), 'MMM d · h:mm a')}
        </span>
      </div>

      <p className="text-xs text-muted-foreground font-body">
        Are you coming to the <strong className="font-serif text-foreground">{meeting.title}</strong> meetup?
        {meeting.meeting_location && <span> · 📍 {meeting.meeting_location}</span>}
      </p>

      {/* Vote buttons */}
      <div className="flex gap-2">
        {responseOrder.map((r) => {
          const config = responseConfig[r];
          const isSelected = myResponse === r;
          return (
            <button
              key={r}
              onClick={() => handleVote(r)}
              disabled={submitting}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-body font-semibold transition-all disabled:opacity-50 ${
                isSelected
                  ? config.color + ' border-2 shadow-sm scale-[1.02]'
                  : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className="text-base">{config.emoji}</span>
              <span>{config.label}</span>
              {counts[r] > 0 && (
                <span className={`text-[10px] font-normal ${isSelected ? '' : 'text-muted-foreground'}`}>
                  {counts[r]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary bar */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {counts.going > 0 && (
              <div className="bg-emerald-500 transition-all" style={{ width: `${(counts.going / total) * 100}%` }} />
            )}
            {counts.maybe > 0 && (
              <div className="bg-amber-400 transition-all" style={{ width: `${(counts.maybe / total) * 100}%` }} />
            )}
            {counts.not_going > 0 && (
              <div className="bg-red-400 transition-all" style={{ width: `${(counts.not_going / total) * 100}%` }} />
            )}
          </div>

          {goingAttendees.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <AttendeeFacePile
                attendees={goingAttendees}
                profiles={profiles}
                onProfilesLoaded={handleProfilesLoaded}
                label="going"
                modalTitle="Who's going"
                modalSubtitle={`${meeting.title} · ${format(new Date(meeting.meeting_date), 'EEE, MMM d · h:mm a')}`}
              />
              <span className="text-[11px] text-muted-foreground font-body shrink-0">
                {total} {total === 1 ? 'response' : 'responses'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingRsvpWidget;
