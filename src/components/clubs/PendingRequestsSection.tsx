import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

interface PendingRow {
  id: string;
  club_id: string;
  created_at: string;
  club_name: string | null;
}

const PendingRequestsSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rows = [], isError } = useQuery({
    queryKey: ['my-pending-join-requests', user?.id],
    queryFn: async (): Promise<PendingRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('club_join_requests')
        .select('id, club_id, created_at, club:clubs(name)')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        club_id: r.club_id,
        created_at: r.created_at,
        club_name: r.club?.name ?? null,
      }));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  if (isError || rows.length === 0) return null;

  const cancel = async (id: string) => {
    const { error } = await supabase.from('club_join_requests').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Request cancelled');
    queryClient.invalidateQueries({ queryKey: ['my-pending-join-requests'] });
  };

  return (
    <section aria-labelledby="pending-heading" className="space-y-2">
      <div className="flex items-baseline gap-2 border-b border-border/60 pb-2">
        <h2
          id="pending-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
        >
          Pending
        </h2>
        <span className="text-xs text-muted-foreground">
          {rows.length} request{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">
                Awaiting approval from <span className="font-medium">{r.club_name ?? 'a club'}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>
              Cancel
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PendingRequestsSection;
