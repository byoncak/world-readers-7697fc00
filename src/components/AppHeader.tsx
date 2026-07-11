import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useClub } from '@/contexts/ClubContext';
import { useQuery } from '@tanstack/react-query';
import { MessagesSquare, Shield, Mail, ChevronDown, Settings, Home } from 'lucide-react';
import wormIcon from '@/assets/worm-icon.png';
import ViewAsHud from './ViewAsHud';
import PointsDisplay from './PointsDisplay';
import NotificationBell from './NotificationBell';
import UserAvatar from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const AppHeader = () => {
  const { user } = useAuth();
  const { isPrivileged, canManageCurrentClub } = useRole();
  const canOpenAdmin = isPrivileged || canManageCurrentClub;
  const { club, clubId, memberships, isClubAdmin, clubPath } = useClub();
  const { pathname } = useLocation();
  const onClubsPage = pathname === '/clubs';

  useEffect(() => {
    if (clubId) localStorage.setItem('lastClubId', clubId);
  }, [clubId]);

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

  const title = onClubsPage ? 'Clubs' : club?.name ?? 'Your clubs';

  return (
    <>
      <header className="safe-top sticky top-0 z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          {onClubsPage ? (
            <div className="flex items-center gap-2 min-w-0">
              <img src={wormIcon} alt="" className="h-6 w-6 shrink-0" />
              <h1 className="font-display text-lg sm:text-2xl font-bold text-foreground truncate">{title}</h1>
            </div>
          ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity outline-none">
              <img src={wormIcon} alt="Worm" className="h-6 w-6 shrink-0" />
              <h1 className="font-display text-lg sm:text-2xl font-bold text-foreground truncate">{title}</h1>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Switch club</DropdownMenuLabel>
              {memberships.length === 0 && (
                <DropdownMenuItem disabled className="text-muted-foreground">No clubs yet</DropdownMenuItem>
              )}
              {memberships.map((m) => (
                <DropdownMenuItem key={m.club_id} asChild>
                  <Link to={`/c/${m.club_id}`} className="flex items-center justify-between w-full">
                    <span className="truncate">{m.club.name}</span>
                    {m.club_id === clubId && <span className="text-xs text-primary ml-2">●</span>}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/clubs" className="flex items-center gap-2"><Home className="h-4 w-4" /> All clubs</Link>
              </DropdownMenuItem>
              {isClubAdmin && clubId && (
                <DropdownMenuItem asChild>
                  <Link to={`/c/${clubId}/manage`} className="flex items-center gap-2"><Settings className="h-4 w-4" /> Manage this club</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          <PointsDisplay />
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {clubId && (
              <>
                <Link to={clubPath('/lounge')} className="hidden sm:flex cozy-btn-ghost items-center gap-1.5 px-5 text-sm">
                  <MessagesSquare className="h-4 w-4" />
                  <span>Lounge</span>
                </Link>
                <Link to={clubPath('/inbox')} className="hidden sm:flex cozy-btn-ghost items-center gap-1.5 px-5 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>Inbox</span>
                </Link>
              </>
            )}
            <NotificationBell />
            {canOpenAdmin && clubId && (
              <Link to={clubPath('/admin')} className="cozy-btn-ghost flex items-center gap-1 sm:gap-1.5 px-2 sm:px-5 text-sm">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <Link to={clubId ? clubPath(`/member/${user?.id}`) : '/clubs'} title="View profile" className="transition-all hover:shadow-md rounded-full">
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
