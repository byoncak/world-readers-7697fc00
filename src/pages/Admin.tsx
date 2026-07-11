import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
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
import { isSuperUser } from '@/lib/superUser';

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, isPrivileged, loading: roleLoading } = useRole();

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  if (!isPrivileged) return <Navigate to="/" replace />;

  const superUser = isSuperUser(user?.id);

  const groups: Array<{
    id: string;
    title: string;
    icon: JSX.Element;
    show: boolean;
    defaultOpen?: boolean;
    body: JSX.Element;
  }> = [
    {
      id: 'reading',
      title: 'Reading',
      icon: <BookOpen className="h-5 w-5 text-muted-foreground" />,
      show: true,
      defaultOpen: true,
      body: (
        <div className="space-y-4">
          <BookManagerWidget />
        </div>
      ),
    },
    {
      id: 'meetings',
      title: 'Meetings & polls',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      show: true,
      body: (
        <div className="space-y-4">
          <MeetingPollToggleWidget />
          <AdminPollManager />
        </div>
      ),
    },
    {
      id: 'announcements',
      title: 'Announcements',
      icon: <Megaphone className="h-5 w-5 text-muted-foreground" />,
      show: true,
      body: <AdminAnnouncementSection />,
    },
    {
      id: 'members',
      title: 'Members & roles',
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
      show: !!(isAdmin && user),
      body: user ? <AdminMembersRoles currentUserId={user.id} /> : <div />,
    },
    {
      id: 'permissions',
      title: 'Role permissions',
      icon: <ShieldCheck className="h-5 w-5 text-muted-foreground" />,
      show: isAdmin,
      body: <RolePermissionsCard />,
    },
    {
      id: 'points',
      title: 'Points',
      icon: <Apple className="h-5 w-5 text-muted-foreground" />,
      show: isAdmin,
      body: <AdminPointsManager />,
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: <Package className="h-5 w-5 text-muted-foreground" />,
      show: isAdmin,
      body: <AdminInventoryManager />,
    },
    {
      id: 'shop',
      title: 'Shop catalog',
      icon: <Store className="h-5 w-5 text-muted-foreground" />,
      show: isAdmin,
      body: <AdminShopEditor />,
    },
    {
      id: 'data',
      title: 'Data station',
      icon: <Database className="h-5 w-5 text-muted-foreground" />,
      show: isAdmin,
      body: <AdminDataStation />,
    },
    {
      id: 'testing',
      title: 'Developer tools',
      icon: <Wrench className="h-5 w-5 text-muted-foreground" />,
      show: !!(superUser && user),
      body: user ? <AdminTestingTools userId={user.id} /> : <div />,
    },
  ];

  const visible = groups.filter(g => g.show);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-24 space-y-3">
      <header className="px-1 pb-1">
        <h1 className="cozy-title text-2xl">Admin</h1>
        <p className="text-sm text-muted-foreground font-body">
          Tap a section to expand. Sections stay collapsed until you need them.
        </p>
      </header>

      {/* Quick-jump chips (mobile-friendly horizontal scroller) */}
      <nav
        aria-label="Admin sections"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar"
      >
        {visible.map(g => (
          <a
            key={g.id}
            href={`#admin-${g.id}`}
            className="shrink-0 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-body text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            {g.title}
          </a>
        ))}
      </nav>

      <div className="space-y-3">
        {visible.map(g => (
          <div key={g.id} id={`admin-${g.id}`} className="scroll-mt-20">
            <CollapsibleSection
              icon={g.icon}
              title={g.title}
              defaultOpen={!!g.defaultOpen}
            >
              {g.body}
            </CollapsibleSection>
          </div>
        ))}
      </div>
    </main>
  );
};

export default Admin;
