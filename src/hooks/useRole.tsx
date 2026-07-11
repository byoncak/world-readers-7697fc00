import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRoleOverride } from './useRoleOverride';
import { useClub } from '@/contexts/ClubContext';
import { useIsSuperUser } from './useIsSuperUser';

export type AppRole = 'admin' | 'moderator' | 'member';

/**
 * Central authorization hook.
 *
 * Scopes are kept strictly separate:
 *  - `role`               : global app role (admin | moderator | member)
 *  - `clubRole`           : role inside the currently-selected club
 *  - `isSuperUser`        : sole global super user (from server RPC)
 *  - `canModerateCommunity`: soft moderation across the app
 *  - `canManageCurrentClub`: full control of the *current* club only
 *  - `isPrivileged`       : global admin/moderator (NEVER inferred from clubs)
 *  - `isAdmin`            : global admin OR super user
 *
 * Club membership never elevates global privilege. That elevation was the
 * root cause of the pre-audit escalation path.
 */
export const useRole = (skipOverride = false) => {
  const { user } = useAuth();
  const { overrideRole } = useRoleOverride();
  const { role: clubRole, isLoadingMemberships } = useClub();
  const { isSuperUser, loading: superLoading } = useIsSuperUser();
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

  const isGlobalAdmin = effectiveRole === 'admin';
  const isGlobalModerator = effectiveRole === 'moderator';

  const clubOwnerOrAdmin = clubRole === 'owner' || clubRole === 'admin';

  return {
    role: effectiveRole,
    clubRole,
    isSuperUser,
    isAdmin: isGlobalAdmin || isSuperUser,
    isPrivileged: isGlobalAdmin || isGlobalModerator || isSuperUser,
    canModerateCommunity: isGlobalAdmin || isGlobalModerator || isSuperUser,
    canManageCurrentClub: clubOwnerOrAdmin || isSuperUser,
    canUseTestingTools: isSuperUser,
    loading: loading || isLoadingMemberships || superLoading,
  };
};
