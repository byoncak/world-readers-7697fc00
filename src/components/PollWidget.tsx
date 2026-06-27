import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StyledName from './StyledName';

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

const PollWidget = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    const { data: pollData } = await supabase
      .from('polls')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!pollData) return;

    const parsed = pollData.map((p: any) => ({
      ...p,
      options: Array.isArray(p.options) ? p.options : [],
    }));
    setPolls(parsed);

    const pollIds = parsed.map((p: Poll) => p.id);
    if (pollIds.length > 0) {
      const { data: voteData } = await supabase
        .from('poll_votes')
        .select('poll_id, user_id, option_index')
        .in('poll_id', pollIds);
      setVotes((voteData as PollVote[]) || []);
    }

    // Fetch creator profiles
    const creatorIds = [...new Set(parsed.map((p: Poll) => p.created_by))];
    if (creatorIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', creatorIds);
      if (profileData) {
        const map: Record<string, string> = {};
        profileData.forEach((p: any) => { map[p.user_id] = p.display_name || 'Reader'; });
        setProfiles(map);
      }
    }
  };

  const toggleVote = async (pollId: string, optionIndex: number, poll: Poll) => {
    if (!user) return;

    const myVotes = votes.filter(v => v.poll_id === pollId && v.user_id === user.id);
    const alreadyVoted = myVotes.some(v => v.option_index === optionIndex);

    if (alreadyVoted) {
      await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .eq('option_index', optionIndex);
    } else {
      if (!poll.multiple_choice && myVotes.length > 0) {
        // Remove existing vote first
        await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', user.id);
      }
      await supabase.from('poll_votes').insert({
        poll_id: pollId,
        user_id: user.id,
        option_index: optionIndex,
      });
    }
    fetchPolls();
  };

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
            {/* Question */}
            <div>
              <h3 className="text-base font-semibold font-serif">{poll.question}</h3>
              <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                by <StyledName userId={poll.created_by} name={profiles[poll.created_by] || 'Reader'} />
                {' · '}{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                {poll.multiple_choice && ' · pick multiple'}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-1.5">
              {poll.options.map((option: string, idx: number) => {
                const optVotes = pollVotes.filter(v => v.option_index === idx).length;
                const pct = totalVoters > 0 ? Math.round((optVotes / totalVoters) * 100) : 0;
                const isSelected = myVotes.some(v => v.option_index === idx);

                return (
                  <button
                    key={idx}
                    onClick={() => toggleVote(poll.id, idx, poll)}
                    className={`relative w-full overflow-hidden rounded-lg border text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-terracotta bg-terracotta/5'
                        : 'border-border hover:border-terracotta/40'
                    }`}
                  >
                    {/* Progress bar background */}
                    {hasVoted && (
                      <div
                        className="absolute inset-y-0 left-0 bg-terracotta/10 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex items-center gap-2 px-3 py-2">
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

            {/* Footer */}
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
