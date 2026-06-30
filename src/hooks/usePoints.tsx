import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/contexts/ClubContext';
import { spawnPointsPop } from '@/components/PointsPopAnimation';

export const usePoints = () => {
  const { user } = useAuth();
  const { clubId } = useClub();
  const [points, setPoints] = useState<number>(0);
  const [lifetime, setLifetime] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const prevPoints = useRef<number | null>(null);

  const fetchPoints = async () => {
    if (!user || !clubId) { setPoints(0); setLifetime(0); setLoading(false); return; }
    const { data } = await supabase
      .from('user_points')
      .select('total_points, lifetime_points')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .maybeSingle();
    const newTotal = data?.total_points ?? 0;

    if (prevPoints.current !== null && newTotal > prevPoints.current) {
      const diff = newTotal - prevPoints.current;
      spawnPointsPop(diff);
    }
    prevPoints.current = newTotal;

    setPoints(newTotal);
    setLifetime(data?.lifetime_points ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    prevPoints.current = null;
    fetchPoints();

    if (!user || !clubId) return;

    const channel = supabase
      .channel(`user_points_${user.id}_${clubId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newRow = payload.new;
          if (newRow && newRow.club_id === clubId) {
            const newTotal = newRow.total_points ?? 0;
            if (prevPoints.current !== null && newTotal > prevPoints.current) {
              const diff = newTotal - prevPoints.current;
              spawnPointsPop(diff);
            }
            prevPoints.current = newTotal;
            setPoints(newTotal);
            setLifetime(newRow.lifetime_points ?? 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, clubId]);

  return { points, lifetime, loading, refetch: fetchPoints };
};
