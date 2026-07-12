import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { BookOpenCheck, Check, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import StyledName from './StyledName';

type RsvpResponse = 'going' | 'not_going' | 'maybe';

interface RsvpRow {
  id: string;
  book_id: string;
  user_id: string;
  response: RsvpResponse;
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

const MeetingRsvpWidget = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<BookMeeting | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [myResponse, setMyResponse] = useState<RsvpResponse | null>(null);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchMeeting = async () => {
    const { data } = await supabase
      .from('books')
      .select('id, title, meeting_date, meeting_location')
      .eq('status', 'current')
      .not('meeting_date', 'is', null)
      .limit(1)
      .single();

    if (data) setMeeting(data as BookMeeting);
    else setMeeting(null);
    return data as BookMeeting | null;
  };

  const fetchRsvps = async (bookId: string) => {
    const { data } = await supabase
      .from('meeting_rsvps')
      .select('*')
      .eq('book_id', bookId);

    const rows = (data ?? []) as unknown as RsvpRow[];
    setRsvps(rows);

    if (user) {
      const mine = rows.find((r) => r.user_id === user.id);
      setMyResponse(mine?.response ?? null);
    }

    // Fetch profile names
    const userIds = rows.map((r) => r.user_id);
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      setProfiles(new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name ?? 'Reader'])));
    }
  };

  useEffect(() => {
    const init = async () => {
      const m = await fetchMeeting();
      if (m) fetchRsvps(m.id);
    };
    init();
  }, [user]);

  useEffect(() => {
    if (!meeting) return;
    const channel = supabase
      .channel('rsvp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_rsvps', filter: `book_id=eq.${meeting.id}` }, () => fetchRsvps(meeting.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [meeting?.id]);

  const handleVote = async (response: RsvpResponse) => {
    if (!user || !meeting) return;
    setSubmitting(true);

    if (myResponse === response) {
      // Remove vote
      await supabase.from('meeting_rsvps').delete().eq('book_id', meeting.id).eq('user_id', user.id);
      setMyResponse(null);
    } else {
      // Upsert
      const existing = rsvps.find((r) => r.user_id === user.id);
      if (existing) {
        await supabase.from('meeting_rsvps').update({ response, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('meeting_rsvps').insert({ book_id: meeting.id, user_id: user.id, response });
      }
      setMyResponse(response);
      toast({ title: `${responseConfig[response].emoji} You're ${responseConfig[response].label.toLowerCase()}!` });
    }

    await fetchRsvps(meeting.id);
    setSubmitting(false);
  };

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

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground font-body hover:text-foreground transition-colors"
          >
            {total} {total === 1 ? 'response' : 'responses'}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {expanded && (
            <div className="space-y-1.5 pt-1">
              {responseOrder.map((r) => {
                const matching = rsvps.filter((rv) => rv.response === r);
                if (matching.length === 0) return null;
                return (
                  <div key={r} className="flex items-start gap-2 text-xs font-body">
                    <span>{responseConfig[r].emoji}</span>
                    <span className="text-muted-foreground flex flex-wrap gap-x-1">
                      {matching.map((rv, idx) => (
                        <span key={rv.user_id}>
                          <StyledName userId={rv.user_id} name={profiles.get(rv.user_id) ?? 'Reader'} />
                          {idx < matching.length - 1 && ', '}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingRsvpWidget;
