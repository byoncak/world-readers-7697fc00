import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/StateBlock';

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const MembersPanel = ({ defaultOpen = false }: { defaultOpen?: boolean }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, bio')
      .order('created_at', { ascending: true });
    if (err) setError(true);
    else if (data) setMembers(data as Member[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="cozy-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2"
        aria-expanded={open}
        aria-label={open ? 'Collapse members list' : 'Expand members list'}
      >
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-terracotta" aria-hidden="true" />
          <h2 className="cozy-title text-2xl">Members</h2>
          {!loading && !error && (
            <span className="text-xs text-muted-foreground font-body">({members.length})</span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="space-y-3 mt-4">
          {loading ? (
            <LoadingBlock label="Loading members…" rows={3} />
          ) : error ? (
            <ErrorBlock message="Couldn't load members." onRetry={load} />
          ) : members.length === 0 ? (
            <EmptyBlock message="No members yet — invite a friend! 🌱" />
          ) : (
            members.map((m) => (
              <Link
                key={m.user_id}
                to={`/member/${m.user_id}`}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-peach text-sm font-bold text-terracotta overflow-hidden shrink-0">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (m.display_name || '?')[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground font-body">
                    {m.display_name || 'Reader'}
                  </p>
                  {m.bio && (
                    <p className="truncate text-xs text-muted-foreground font-body">{m.bio}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MembersPanel;
