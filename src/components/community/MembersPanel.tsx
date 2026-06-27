import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const MembersPanel = ({ defaultOpen = false }: { defaultOpen?: boolean }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, bio')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMembers(data as Member[]); });
  }, []);

  return (
    <div className="cozy-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-terracotta" />
          <h2 className="cozy-title text-2xl">Members</h2>
          <span className="text-xs text-muted-foreground font-body">({members.length})</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-3 mt-4">
          {members.map((m) => (
            <Link
              key={m.user_id}
              to={`/member/${m.user_id}`}
              className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-peach text-sm font-bold text-terracotta overflow-hidden shrink-0">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.display_name || 'Reader'} className="h-full w-full object-cover" />
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
          ))}
          {members.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground font-body">
              No members yet 🌱
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MembersPanel;
