import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Club {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  accent_color: string | null;
  visibility: 'public' | 'private';
  member_cap: number | null;
  join_policy: 'instant' | 'approval';
  owner_id: string;
}

export interface ClubMembership {
  club_id: string;
  role: 'owner' | 'admin' | 'member';
  club: Club;
}

interface ClubContextValue {
  clubId: string | null;
  club: Club | null;
  role: 'owner' | 'admin' | 'member' | null;
  isClubAdmin: boolean;
  memberships: ClubMembership[];
  isLoadingMemberships: boolean;
  clubPath: (path?: string) => string;
}

const ClubContext = createContext<ClubContextValue | null>(null);

export const ClubProvider = ({ children }: { children: ReactNode }) => {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const clubId = clubIdParam ?? null;
  const { user } = useAuth();

  const { data: memberships = [], isLoading: isLoadingMemberships } = useQuery({
    queryKey: ['user-clubs', user?.id],
    queryFn: async (): Promise<ClubMembership[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('club_members')
        .select('club_id, role, club:clubs(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data as any[])
        .filter((m) => m.club)
        .map((m) => ({ club_id: m.club_id, role: m.role, club: m.club })) as ClubMembership[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const value = useMemo<ClubContextValue>(() => {
    const active = memberships.find((m) => m.club_id === clubId) ?? null;
    const club = active?.club ?? null;
    const role = active?.role ?? null;
    return {
      clubId,
      club,
      role,
      isClubAdmin: role === 'owner' || role === 'admin',
      memberships,
      isLoadingMemberships,
      clubPath: (path = '') => (clubId ? `/c/${clubId}${path}` : '/clubs'),
    };
  }, [clubId, memberships, isLoadingMemberships]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
};

export const useClub = () => {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used inside ClubProvider');
  return ctx;
};

/** Returns the active club id or throws. Use inside pages that require a club. */
export const useClubId = () => {
  const { clubId } = useClub();
  return clubId;
};
