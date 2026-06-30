import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRoleOverride } from './useRoleOverride';
import { useClub } from '@/contexts/ClubContext';

export type AppRole = 'admin' | 'moderator' | 'member';

export const useRole = (skipOverride = false) => {
  const { user } = useAuth();
  const { overrideRole } = useRoleOverride();
  const { role: clubRole, isLoadingMemberships } = useClub();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setRole((data?.role as AppRole) ?? null);
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const effectiveRole = (!skipOverride && overrideRole) ? overrideRole : role;

  // Treat club owners/admins as privileged inside their own club, even if they
  // have no global app role.
  const clubElevatesToAdmin = clubRole === 'owner' || clubRole === 'admin';

  const isAdmin = effectiveRole === 'admin' || clubElevatesToAdmin;
  const isPrivileged =
    effectiveRole === 'admin' ||
    effectiveRole === 'moderator' ||
    clubElevatesToAdmin;

  return {
    role: effectiveRole,
    isAdmin,
    isPrivileged,
    loading: loading || isLoadingMemberships,
  };
};
