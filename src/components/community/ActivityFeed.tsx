import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Activity, MessageCircle, BookOpen, ThumbsUp, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from '@/components/UserAvatar';
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/StateBlock';
import { useClub } from '@/contexts/ClubContext';

interface FeedEvent {
  id: string;
  type: 'discussion' | 'progress' | 'cheer' | 'new_member';
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  description: string;
  created_at: string;
}

const ICONS = {
  discussion: MessageCircle,
  progress: BookOpen,
  cheer: ThumbsUp,
  new_member: UserPlus,
};

const ActivityFeed = ({ defaultOpen = false }: { defaultOpen?: boolean }) => {
  const { clubPath } = useClub();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const allEvents: FeedEvent[] = [];

      const [{ data: discussions, error: dErr }, { data: cheers, error: cErr }, { data: members, error: mErr }] = await Promise.all([
        supabase
          .from('discussions')
          .select('id, user_id, created_at, parent_id')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('cheers')
          .select('id, from_user_id, to_user_id, created_at, message')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      if (dErr || cErr || mErr) throw dErr || cErr || mErr;

      const userIds = new Set<string>();
      discussions?.forEach(d => userIds.add(d.user_id));
      cheers?.forEach(c => { userIds.add(c.from_user_id); userIds.add(c.to_user_id); });
      members?.forEach(m => userIds.add(m.user_id));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', [...userIds]);
      const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      discussions?.forEach(d => {
        const p = pMap.get(d.user_id);
        allEvents.push({
          id: `disc-${d.id}`,
          type: 'discussion',
          user_id: d.user_id,
          display_name: p?.display_name || 'Reader',
          avatar_url: p?.avatar_url || null,
          description: d.parent_id ? 'replied in a discussion' : 'started a discussion',
          created_at: d.created_at,
        });
      });

      cheers?.forEach(c => {
        const from = pMap.get(c.from_user_id);
        const to = pMap.get(c.to_user_id);
        allEvents.push({
          id: `cheer-${c.id}`,
          type: 'cheer',
          user_id: c.from_user_id,
          display_name: from?.display_name || 'Reader',
          avatar_url: from?.avatar_url || null,
          description: `cheered on ${to?.display_name || 'someone'}`,
          created_at: c.created_at,
        });
      });

      members?.forEach(m => {
        allEvents.push({
          id: `member-${m.user_id}`,
          type: 'new_member',
          user_id: m.user_id,
          display_name: m.display_name || 'A new reader',
          avatar_url: m.avatar_url || null,
          description: 'joined the club',
          created_at: m.created_at,
        });
      });

      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(allEvents.slice(0, 20));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="cozy-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2"
        aria-expanded={open}
        aria-label={open ? 'Collapse recent activity' : 'Expand recent activity'}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="cozy-title text-2xl">Recent Activity</h2>
          {!loading && !error && <span className="text-xs text-muted-foreground font-body">({events.length})</span>}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="mt-4 space-y-0.5">
          {loading ? (
            <LoadingBlock label="Loading activity…" rows={4} />
          ) : error ? (
            <ErrorBlock message="Couldn't fetch the latest activity." onRetry={load} />
          ) : !events.length ? (
            <EmptyBlock message="No activity yet — say hi in the lounge! 🌱" />
          ) : (
            events.map(ev => {
              const Icon = ICONS[ev.type];
              return (
                <div key={ev.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs">
                  <UserAvatar
                    userId={ev.user_id}
                    avatarUrl={ev.avatar_url}
                    displayName={ev.display_name}
                    size="sm"
                    className="h-6 w-6"
                  />
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 font-body">
                    <Link to={`/member/${ev.user_id}`} className="font-semibold text-foreground hover:underline">
                      {ev.display_name}
                    </Link>{' '}
                    <span className="text-muted-foreground">{ev.description}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
