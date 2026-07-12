import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useClub } from '@/contexts/ClubContext';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Calendar,
  Megaphone,
  Users,
  ShieldCheck,
  Apple,
  Package,
  Store,
  Database,
  Wrench,
  Home,
  Landmark,
  Shield,
} from 'lucide-react';

import BookManagerWidget from '@/components/BookManagerWidget';
import MeetingPollToggleWidget from '@/components/MeetingPollToggleWidget';
import AdminAnnouncementSection from '@/components/admin/AdminAnnouncementSection';
import AdminPollManager from '@/components/admin/AdminPollManager';
import AdminMembersRoles from '@/components/admin/AdminMembersRoles';
import RolePermissionsCard from '@/components/admin/RolePermissionsCard';
import AdminTestingTools from '@/components/admin/AdminTestingTools';
import AdminPointsManager from '@/components/admin/AdminPointsManager';
import AdminDataStation from '@/components/admin/AdminDataStation';
import AdminInventoryManager from '@/components/admin/AdminInventoryManager';
import AdminShopEditor from '@/components/admin/AdminShopEditor';
import CollapsibleSection from '@/components/CollapsibleSection';

type Scope = 'club' | 'community' | 'system';

const SCOPE_LABEL: Record<Scope, string> = {
  club: 'This club',
  community: 'Community',
  system: 'Entire app',
};

const SCOPE_TAB_META: Record<Scope, { label: string; Icon: typeof Home }> = {
  club:      { label: 'Club',      Icon: Home },
  community: { label: 'Community', Icon: Landmark },
  system:    { label: 'System',    Icon: Shield },
};

const Admin = () => {
  const { user } = useAuth();
  const {
    isSuperUser,
    canModerateCommunity,
    canManageCurrentClub,
    loading: roleLoading,
  } = useRole();
  const { club } = useClub();
  const [activeScope, setActiveScope] = useState<Scope>('club');

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  if (!canManageCurrentClub && !canModerateCommunity && !isSuperUser) {
    return <Navigate to="/" replace />;
  }

  type Group = {
    id: string;
    scope: Scope;
    title: string;
    icon: JSX.Element;
    show: boolean;
    defaultOpen?: boolean;
    /** Render body directly, without an accordion wrapper. */
    flat?: boolean;
    body: JSX.Element;
  };

  const groups: Group[] = [
    // ── Club scope ────────────────────────────────────────────────────
    // Books is the primary card; render directly (BookManagerWidget is
    // itself a cozy-card — no extra wrapper needed).
    {
      id: 'books',
      scope: 'club',
      title: 'Manage books',
      icon: <></>,
      show: canManageCurrentClub,
      flat: true,
      body: <BookManagerWidget />,
    },
    {
      id: 'meetings',
      scope: 'club',
      title: 'Meetings & polls',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      show: canManageCurrentClub,
      body: (
        <div className="space-y-4">
          <MeetingPollToggleWidget />
          <AdminPollManager />
        </div>
      ),
    },
    {
      id: 'announcements',
      scope: 'club',
      title: 'Announcements',
      icon: <Megaphone className="h-5 w-5 text-muted-foreground" />,
      show: canManageCurrentClub,
      body: <AdminAnnouncementSection />,
    },

    // ── Community scope ───────────────────────────────────────────────
    {
      id: 'points',
      scope: 'community',
      title: 'Points',
      icon: <Apple className="h-5 w-5 text-muted-foreground" />,
      show: canModerateCommunity,
      body: <AdminPointsManager />,
    },
    {
      id: 'inventory',
      scope: 'community',
      title: 'Inventory',
      icon: <Package className="h-5 w-5 text-muted-foreground" />,
      show: isSuperUser,
      body: <AdminInventoryManager />,
    },
    {
      id: 'shop',
      scope: 'community',
      title: 'Shop catalog',
      icon: <Store className="h-5 w-5 text-muted-foreground" />,
      show: isSuperUser,
      body: <AdminShopEditor />,
    },

    // ── System scope (super user only) ────────────────────────────────
    {
      id: 'members',
      scope: 'system',
      title: 'Global roles',
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
      show: !!(isSuperUser && user),
      body: user ? <AdminMembersRoles currentUserId={user.id} /> : <div />,
    },
    {
      id: 'permissions',
      scope: 'system',
      title: 'Role reference',
      icon: <ShieldCheck className="h-5 w-5 text-muted-foreground" />,
      show: isSuperUser,
      body: <RolePermissionsCard />,
    },
    {
      id: 'data',
      scope: 'system',
      title: 'Data station',
      icon: <Database className="h-5 w-5 text-muted-foreground" />,
      show: isSuperUser,
      body: <AdminDataStation />,
    },
    {
      id: 'testing',
      scope: 'system',
      title: 'Developer tools',
      icon: <Wrench className="h-5 w-5 text-muted-foreground" />,
      show: !!(isSuperUser && user),
      body: user ? <AdminTestingTools userId={user.id} /> : <div />,
    },
  ];

  const visible = groups.filter(g => g.show);
  const scopeCounts: Record<Scope, number> = { club: 0, community: 0, system: 0 };
  for (const g of visible) scopeCounts[g.scope]++;

  // Only show scopes the user actually has controls in.
  const availableScopes: Scope[] = (['club', 'community', 'system'] as Scope[])
    .filter(s => scopeCounts[s] > 0);

  const effectiveScope: Scope = availableScopes.includes(activeScope)
    ? activeScope
    : (availableScopes[0] ?? 'club');

  const inScope = visible.filter(g => g.scope === effectiveScope);

  const showTabs = availableScopes.length > 1;
  const clubOnly = availableScopes.length === 1 && availableScopes[0] === 'club';

  const heading = clubOnly && club
    ? `Manage ${club.name}`
    : effectiveScope === 'club' && club
      ? `Manage ${club.name}`
      : effectiveScope === 'community'
        ? 'Community moderation'
        : effectiveScope === 'system'
          ? 'System controls'
          : 'Admin';

  const subhead = effectiveScope === 'club'
    ? 'Books, members, announcements, and club settings.'
    : effectiveScope === 'community'
      ? 'Community-wide moderation. Affects readers across clubs.'
      : 'Changes affect every club and every reader.';

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-32 space-y-4">
      <header className="px-1 pb-1">
        <h1 className="cozy-title text-2xl">{heading}</h1>
        <p className="text-sm text-muted-foreground font-body">{subhead}</p>
      </header>

      {showTabs && (
        <nav
          aria-label="Admin scope"
          className="sticky top-[57px] z-10 -mx-1 flex gap-1 rounded-xl border border-border/60 bg-card/80 p-1 backdrop-blur-sm"
        >
          {availableScopes.map(id => {
            const { label, Icon } = SCOPE_TAB_META[id];
            const count = scopeCounts[id];
            const active = id === effectiveScope;
            return (
              <button
                key={id}
                onClick={() => setActiveScope(id)}
                aria-pressed={active}
                className={`flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-body font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/10'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Compact scope notice — only when tabs are visible or scope is elevated */}
      {(showTabs || effectiveScope !== 'club') && (
        <div
          className={`rounded-lg border-l-4 px-3 py-2 text-xs font-body ${
            effectiveScope === 'system'
              ? 'border-destructive bg-destructive/5 text-destructive'
              : effectiveScope === 'community'
              ? 'border-amber-500 bg-amber-500/5 text-amber-700 dark:text-amber-400'
              : 'border-primary/60 bg-primary/5 text-foreground/80'
          }`}
        >
          <strong>{SCOPE_LABEL[effectiveScope]}.</strong>{' '}
          {effectiveScope === 'system'
            ? 'Only the super user can make these changes.'
            : effectiveScope === 'community'
            ? 'Affects readers across all clubs.'
            : 'Only affects this club.'}
        </div>
      )}

      <div className="space-y-3">
        {inScope.map(g => (
          <div key={g.id} id={`admin-${g.id}`} className="scroll-mt-32">
            {g.flat ? (
              g.body
            ) : (
              <CollapsibleSection
                icon={g.icon}
                title={g.title}
                defaultOpen={!!g.defaultOpen}
              >
                {g.body}
              </CollapsibleSection>
            )}
          </div>
        ))}
        {inScope.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground font-body">
              You don't have any controls in this scope.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Admin;
