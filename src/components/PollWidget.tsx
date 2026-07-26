import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StyledName from './StyledName';
import { isStaleGen } from '@/lib/guards';

interface Poll {
  id: string;
  question: string;
  options: string[];
  multiple_choice: boolean;
  active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

interface PollVote {
  poll_id: string;
  user_id: string;
  option_index: number;
}

interface PollWidgetProps {
  clubId?: string | null;
}

const PollWidget = ({ clubId: clubIdProp }: PollWidgetProps = {}) => {
  const { user } = useAuth();
  const { clubId: ctxClubId } = useClub();
  const clubId = clubIdProp !== undefined ? clubIdProp : ctxClubId;
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  // Track in-flight vote toggles per `${pollId}:${optionIndex}` so the same
  // option can't be spammed and controls can render a disabled state.
  const [saving, setSaving] = useState<Set<string>>(new Set());
  // Generation counter — bumped on every club switch so late fetches for a
  // previous club can't clobber the current club's state.
  const genRef = useRef(0);

  useEffect(() => {
    genRef.current += 1;
    setPolls([]);
    setVotes([]);
    setProfiles({});
    setError(false);
    setSaving(new Set());
    if (clubId) fetchPolls(clubId, genRef.current);
  }, [clubId]);

  const fetchPolls = async (activeClubId: string, gen: number = genRef.current) => {
    const { data: pollData, error: pollErr } = await supabase
      .from('polls')
      .select('*')
      .eq('active', true)
      .eq('club_id', activeClubId)
      .order('created_at', { ascending: false });

    if (isStaleGen(gen, genRef.current)) return;
    if (pollErr) { setError(true); return; }
    if (!pollData) return;

    const parsed = pollData.map((p: any) => ({
      ...p,
      options: Array.isArray(p.options) ? p.options : [],
    }));
    setPolls(parsed);

    const pollIds = parsed.map((p: Poll) => p.id);
    if (pollIds.length > 0) {
      const { data: voteData, error: voteErr } = await supabase
        .from('poll_votes')
        .select('poll_id, user_id, option_index')
        .in('poll_id', pollIds);
      if (isStaleGen(gen, genRef.current)) return;
      // A silent vote-query failure would render polls with 0 votes and let
      // users double-vote — surface the error so the retry UI shows.
      if (voteErr) { setError(true); return; }
      setVotes((voteData as PollVote[]) || []);
    } else {
      setVotes([]);
    }

    const creatorIds = [...new Set(parsed.map((p: Poll) => p.created_by))];
    if (creatorIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', creatorIds);
      if (isStaleGen(gen, genRef.current)) return;
      if (profileData) {
        const map: Record<string, string> = {};
        profileData.forEach((p: any) => { map[p.user_id] = p.display_name || 'Reader'; });
        setProfiles(map);
      }
    }
  };

  const toggleVote = async (pollId: string, optionIndex: number, poll: Poll) => {
    if (!user || !clubId) return;
    // Lock the WHOLE poll while any write is in flight — otherwise two
    // options on the same single-choice poll can race and leave the user
    // with two votes.
    if (saving.has(pollId)) return;

    const myVotes = votes.filter(v => v.poll_id === pollId && v.user_id === user.id);
    const alreadyVoted = myVotes.some(v => v.option_index === optionIndex);
    const capturedGen = genRef.current;

    setSaving((prev) => {
      const next = new Set(prev);
      next.add(pollId);
      return next;
    });

    let opErr: any = null;
    if (alreadyVoted) {
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .eq('option_index', optionIndex);
      opErr = error;
    } else {
      if (!poll.multiple_choice && myVotes.length > 0) {
        const { error: delErr } = await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', user.id);
        // If clearing prior single-choice votes fails, abort the insert to
        // avoid leaving the user with two votes on a single-choice poll.
        if (delErr) opErr = delErr;
      }
      if (!opErr) {
        const { error } = await supabase.from('poll_votes').insert({
          poll_id: pollId,
          user_id: user.id,
          club_id: clubId,
          option_index: optionIndex,
        } as any);
        opErr = error;
      }
    }

    setSaving((prev) => {
      const next = new Set(prev);
      next.delete(pollId);
      return next;
    });

    // Ignore results from a poll interaction on a club we've since left.
    if (isStaleGen(capturedGen, genRef.current)) return;

    if (opErr) {
      toast.error("Couldn't record your vote. Try again.");
      return;
    }
    fetchPolls(clubId, capturedGen);
  };

  if (error) {
    return (
      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-2">
        <p className="text-sm text-muted-foreground font-body">Couldn&rsquo;t load polls.</p>
        <button
          type="button"
          onClick={() => { setError(false); if (clubId) fetchPolls(clubId); }}
          className="inline-flex items-center justify-center min-h-11 rounded-lg bg-card px-4 text-xs font-semibold text-foreground border border-border/60 shadow-sm hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground font-body">No active polls right now 📊</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1 space-y-4">
      {polls.map((poll) => {
        const pollVotes = votes.filter(v => v.poll_id === poll.id);
        const totalVoters = new Set(pollVotes.map(v => v.user_id)).size;
        const myVotes = pollVotes.filter(v => v.user_id === user?.id);
        const hasVoted = myVotes.length > 0;

        return (
          <div key={poll.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold font-serif">{poll.question}</h3>
              <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                by <StyledName userId={poll.created_by} name={profiles[poll.created_by] || 'Reader'} />
                {' · '}{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                {poll.multiple_choice && ' · pick multiple'}
              </p>
            </div>

            <div className="space-y-1.5">
              {poll.options.map((option: string, idx: number) => {
                const optVotes = pollVotes.filter(v => v.option_index === idx).length;
                const pct = totalVoters > 0 ? Math.round((optVotes / totalVoters) * 100) : 0;
                const isSelected = myVotes.some(v => v.option_index === idx);
                const isSaving = saving.has(poll.id);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleVote(poll.id, idx, poll)}
                    disabled={isSaving}
                    aria-pressed={isSelected}
                    aria-busy={isSaving}
                    className={`relative w-full min-h-11 overflow-hidden rounded-lg border text-left transition-all duration-200 disabled:opacity-60 disabled:cursor-wait ${
                      isSelected
                        ? 'border-terracotta bg-terracotta/5'
                        : 'border-border hover:border-terracotta/40'
                    }`}
                  >
                    {hasVoted && (
                      <div
                        className="absolute inset-y-0 left-0 bg-terracotta/10 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex min-h-11 items-center gap-2 px-3 py-2">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected ? 'border-terracotta bg-terracotta text-white' : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="flex-1 text-sm font-body">{option}</span>
                      {hasVoted && (
                        <span className="text-xs font-semibold text-muted-foreground font-body">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground font-body">
              {totalVoters} {totalVoters === 1 ? 'vote' : 'votes'}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default PollWidget;
