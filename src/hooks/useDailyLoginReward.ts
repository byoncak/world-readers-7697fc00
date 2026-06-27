import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useDailyLoginReward = () => {
  const { user } = useAuth();
  const [claimable, setClaimable] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [recheckKey, setRecheckKey] = useState(0);

  useEffect(() => {
    const handler = () => setRecheckKey((k) => k + 1);
    window.addEventListener('dailyRewardReset', handler);
    return () => window.removeEventListener('dailyRewardReset', handler);
  }, []);

  useEffect(() => {
    if (!user) {
      setClaimable(false);
      return;
    }

    (async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('point_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action_type', 'daily_login')
        .gte('created_at', todayStart.toISOString());

      setClaimable((count ?? 0) === 0);
    })();
  }, [user, recheckKey]);

  const claim = useCallback(async () => {
    if (!user || claiming) return;
    setClaiming(true);
    try {
      await supabase.rpc('award_points', {
        _user_id: user.id,
        _amount: 25,
        _action_type: 'daily_login',
        _description: 'Daily login reward',
      });
      setClaimable(false);
    } finally {
      setClaiming(false);
    }
  }, [user, claiming]);

  return { claimable, claiming, claim };
};
