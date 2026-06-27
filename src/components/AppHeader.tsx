import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useQuery } from '@tanstack/react-query';
import { MessagesSquare, Shield, Mail } from 'lucide-react';
import wormIcon from '@/assets/worm-icon.png';
import ViewAsHud from './ViewAsHud';
import PointsDisplay from './PointsDisplay';
import NotificationBell from './NotificationBell';
import UserAvatar from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';

interface AppHeaderProps {
  showHome?: boolean;
  showCommunity?: boolean;
}

const AppHeader = ({ showHome = false, showCommunity = false }: AppHeaderProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin, isPrivileged } = useRole();

  const { data: profile } = useQuery({
    queryKey: ['header-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <header className="safe-top sticky top-0 z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
            <img src={wormIcon} alt="Worm" className="h-6 w-6 shrink-0" />
            <h1 className="font-display text-lg sm:text-2xl font-bold text-foreground truncate">Detritivores</h1>
          </Link>
          <PointsDisplay />
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link to="/lounge" className="hidden sm:flex cozy-btn-ghost items-center gap-1.5 px-5 text-sm">
              <MessagesSquare className="h-4 w-4" />
              <span>Lounge</span>
            </Link>
            <Link to="/inbox" className="hidden sm:flex cozy-btn-ghost items-center gap-1.5 px-5 text-sm">
              <Mail className="h-4 w-4" />
              <span>Inbox</span>
            </Link>
            <NotificationBell />
            {isPrivileged && (
              <Link to="/admin" className="cozy-btn-ghost flex items-center gap-1 sm:gap-1.5 px-2 sm:px-5 text-sm">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <Link to={`/member/${user?.id}`} title="View profile" className="transition-all hover:shadow-md rounded-full">
              <UserAvatar
                userId={user?.id || ''}
                avatarUrl={profile?.avatar_url ?? null}
                displayName={profile?.display_name ?? null}
                size="sm"
                className="hover:border-primary"
                linkToProfile={false}
              />
            </Link>
          </div>
        </div>
      </header>
      <ViewAsHud />
    </>
  );
};

export default AppHeader;
