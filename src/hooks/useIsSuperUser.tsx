import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Server-authoritative check for the sole global super user.
 *
 * Reads the SECURITY DEFINER `public.is_super_user(uid)` RPC. Fails closed:
 * returns `false` while loading, signed out, or on any error. There is no
 * client-side bypass — hiding UI here is only cosmetic; the same check is
 * repeated by RLS policies, RPCs, and edge functions.
 */
export const useIsSuperUser = () => {
  const { user } = useAuth();
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setIsSuperUser(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .rpc('is_super_user', { _user_id: user.id })
      .then(({ data, error }) => {
        if (!alive) return;
        setIsSuperUser(!error && data === true);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user?.id]);

  return { isSuperUser, loading };
};
