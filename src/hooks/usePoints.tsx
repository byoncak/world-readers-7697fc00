import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { spawnPointsPop } from '@/components/PointsPopAnimation';

interface PointsRow { total_points: number; lifetime_points: number }

// Module-scoped realtime subscription with refcounting. Multiple hook
// callers (header, shop, widgets) share a single Supabase channel and a
// single query cache entry — no duplicate fetches, no duplicate work.
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let refCount = 0;
let activeKey = '';

const pointsQueryKey = (userId: string, clubId: string) => ['user-points', userId, clubId] as const;

async function fetchPoints(userId: string, clubId: string): Promise<PointsRow> {
  const { data } = await supabase
    .from('user_points')
    .select('total_points, lifetime_points')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .maybeSingle();
  return {
    total_points: data?.total_points ?? 0,
    lifetime_points: data?.lifetime_points ?? 0,
  };
}

export const usePoints = () => {
  const { user } = useAuth();
  const { clubId } = useClub();
  const qc = useQueryClient();
  const prev = useRef<number | null>(null);
  const baselineClubRef = useRef<string | null>(null);

  const isTestUser = user?.email === 'testuser@bookclub.local';
  const enabled = !!user && !!clubId && !isTestUser;
  const key = enabled ? pointsQueryKey(user!.id, clubId!) : ['user-points', 'disabled'];

  // Reset the diff baseline on every club change so switching clubs never
  // spawns a phantom reward pop. New baseline is set below once data lands.
  useEffect(() => {
    if (clubId !== baselineClubRef.current) {
      prev.current = null;
      baselineClubRef.current = clubId;
    }
  }, [clubId]);

  const query = useQuery<PointsRow>({
    queryKey: key,
    queryFn: () => fetchPoints(user!.id, clubId!),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Shared realtime subscription (one per user+club, not per mount)
  useEffect(() => {
    if (!enabled) return;
    const wantKey = `${user!.id}::${clubId!}`;

    // If the active key changed under us, tear down the old channel.
    if (sharedChannel && activeKey !== wantKey) {
      supabase.removeChannel(sharedChannel);
      sharedChannel = null;
      refCount = 0;
      activeKey = '';
    }

    if (!sharedChannel) {
      activeKey = wantKey;
      sharedChannel = supabase
        .channel(`user_points_shared_${wantKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_points',
            filter: `user_id=eq.${user!.id}`,
          },
          (payload: any) => {
            const newRow = payload.new;
            if (newRow && newRow.club_id === clubId) {
              qc.setQueryData<PointsRow>(pointsQueryKey(user!.id, clubId!), {
                total_points: newRow.total_points ?? 0,
                lifetime_points: newRow.lifetime_points ?? 0,
              });
            }
          },
        )
        .subscribe();
    }
    refCount += 1;
    return () => {
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        activeKey = '';
      }
    };
  }, [enabled, user, clubId, qc]);

  const total = isTestUser ? 999999 : query.data?.total_points ?? 0;
  const lifetime = isTestUser ? 999999 : query.data?.lifetime_points ?? 0;

  // Trigger the points-pop animation on true increases only.
  // Skip while data is still loading, and skip the very first value we see
  // for a given club (that's hydration/baseline, not an earned reward).
  useEffect(() => {
    if (!enabled || query.isLoading || query.data === undefined) return;
    if (prev.current !== null && total > prev.current) {
      spawnPointsPop(total - prev.current);
    }
    prev.current = total;
  }, [total, enabled, query.isLoading, query.data]);

  const refetch = () => {
    if (enabled) qc.invalidateQueries({ queryKey: pointsQueryKey(user!.id, clubId!) });
  };

  return {
    points: total,
    lifetime,
    loading: enabled ? query.isLoading : false,
    refetch,
  };
};
