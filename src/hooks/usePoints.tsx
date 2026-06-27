import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { spawnPointsPop } from '@/components/PointsPopAnimation';

export const usePoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [lifetime, setLifetime] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const prevPoints = useRef<number | null>(null);

  const fetchPoints = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_points')
      .select('total_points, lifetime_points')
      .eq('user_id', user.id)
      .maybeSingle();
    const newTotal = data?.total_points ?? 0;
    
    // If points increased, spawn animation
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
    fetchPoints();

    if (!user) return;

    // Subscribe to realtime changes on user_points for this user
    const channel = supabase
      .channel(`user_points_${user.id}`)
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
          if (newRow) {
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
  }, [user]);

  return { points, lifetime, loading, refetch: fetchPoints };
};
