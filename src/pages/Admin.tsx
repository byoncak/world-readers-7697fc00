import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Shield, ArrowLeft } from 'lucide-react';
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
import { Navigate } from 'react-router-dom';

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

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <BookManagerWidget />
        <MeetingPollToggleWidget />
        <AdminPollManager />
        <AdminAnnouncementSection />
        {isAdmin && user && <AdminMembersRoles currentUserId={user.id} />}
        {isAdmin && <RolePermissionsCard />}
        {isAdmin && <AdminPointsManager />}
        {isAdmin && <AdminInventoryManager />}
        {isAdmin && <AdminShopEditor />}
        {isAdmin && <AdminDataStation />}
        {isAdmin && user && <AdminTestingTools userId={user.id} />}
      </main>
    </>
  );
};

export default Admin;
