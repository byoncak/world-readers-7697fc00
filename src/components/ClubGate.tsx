import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useClub } from '@/contexts/ClubContext';

/** Renders nested club routes only if the current user is a member of :clubId. */
const ClubGate = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { memberships, isLoadingMemberships } = useClub();

  if (isLoadingMemberships) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  const isMember = memberships.some((m) => m.club_id === clubId);
  if (!isMember) return <Navigate to="/clubs" replace />;

  return <Outlet />;
};

export default ClubGate;
