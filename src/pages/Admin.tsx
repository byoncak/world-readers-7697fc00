import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  BookOpen,
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

const SCOPE_TABS: { id: Scope; label: string; Icon: typeof Home }[] = [
  { id: 'club',      label: 'Club',       Icon: Home },
  { id: 'community', label: 'Community',  Icon: Landmark },
  { id: 'system',    label: 'System',     Icon: Shield },
];

const Admin = () => {
  const { user } = useAuth();
  const {
    isPrivileged,
    isSuperUser,
    canModerateCommunity,
    canManageCurrentClub,
    loading: roleLoading,
  } = useRole();
  const [activeScope, setActiveScope] = useState<Scope>('club');

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  // Any privilege scope is enough to see the page; each card gates itself.
  if (!canManageCurrentClub && !canModerateCommunity && !isSuperUser) {
    return <Navigate to="/" replace />;
  }

  const groups: Array<{
    id: string;
    scope: Scope;
    title: string;
    icon: JSX.Element;
    show: boolean;
    defaultOpen?: boolean;
    body: JSX.Element;
  }> = [
    // ── Club scope ────────────────────────────────────────────────────
    {
      id: 'reading',
      scope: 'club',
      title: 'Reading',
      icon: <BookOpen className="h-5 w-5 text-muted-foreground" />,
      show: canManageCurrentClub,
      defaultOpen: true,
      body: <div className="space-y-4"><BookManagerWidget /></div>,
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
      show: isSuperUser, // grant/relock is super-user-only server-side
      body: <AdminInventoryManager />,
    },
    {
      id: 'shop',
      scope: 'community',
      title: 'Shop catalog',
      icon: <Store className="h-5 w-5 text-muted-foreground" />,
      show: isSuperUser, // shop_items RLS is super-user-only
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
  const scopeCounts = useMemo(() => {
    const c: Record<Scope, number> = { club: 0, community: 0, system: 0 };
    for (const g of visible) c[g.scope]++;
    return c;
  }, [visible]);

  // If the active scope is empty for this user, jump to the first with content.
  const effectiveScope: Scope = scopeCounts[activeScope] > 0
    ? activeScope
    : (['club', 'community', 'system'] as Scope[]).find(s => scopeCounts[s] > 0) ?? 'club';

  const inScope = visible.filter(g => g.scope === effectiveScope);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-24 space-y-4">
      <header className="px-1 pb-1">
        <h1 className="cozy-title text-2xl">Admin</h1>
        <p className="text-sm text-muted-foreground font-body">
          Actions are scoped. Watch the label on each card before you act.
        </p>
      </header>

      {/* Scope segmented control */}
      <nav
        aria-label="Admin scope"
        className="sticky top-[57px] z-10 -mx-1 flex gap-1 rounded-xl border border-border/60 bg-card/80 p-1 backdrop-blur-sm"
      >
        {SCOPE_TABS.map(({ id, label, Icon }) => {
          const count = scopeCounts[id];
          const active = id === effectiveScope;
          const disabled = count === 0;
          return (
            <button
              key={id}
              onClick={() => !disabled && setActiveScope(id)}
              disabled={disabled}
              aria-pressed={active}
              className={`flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-body font-semibold transition-all ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {count > 0 && (
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/10'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Scope banner */}
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
          ? 'Changes here affect every club and every reader. Only the super user can make them.'
          : effectiveScope === 'community'
          ? 'Community-wide moderation. Affects readers across clubs.'
          : 'Only affects the club you are viewing right now.'}
      </div>

      <div className="space-y-3">
        {inScope.map(g => (
          <div key={g.id} id={`admin-${g.id}`} className="scroll-mt-32">
            <CollapsibleSection
              icon={g.icon}
              title={g.title}
              defaultOpen={!!g.defaultOpen}
            >
              {g.body}
            </CollapsibleSection>
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
