import { Navigate, useSearchParams } from 'react-router-dom';
import { useClub } from '@/contexts/ClubContext';

/** Sends users from "/" to their first club (or the Clubs landing page). */
const HomeRedirect = () => {
  const { memberships, isLoadingMemberships } = useClub();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  if (isLoadingMemberships) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  // Invite links always route through the Clubs hub so users see the
  // explanatory banner and the code stays visible.
  if (inviteCode) {
    return <Navigate to={`/clubs?invite=${encodeURIComponent(inviteCode)}`} replace />;
  }

  if (memberships.length === 0) {
    return <Navigate to="/clubs" replace />;
  }

  const last = typeof window !== 'undefined' ? localStorage.getItem('lastClubId') : null;
  const matchedLast = last ? memberships.find((m) => m.club_id === last) : null;
  if (last && !matchedLast) {
    try { localStorage.removeItem('lastClubId'); } catch {}
  }
  const target = matchedLast ?? memberships[0];
  return <Navigate to={`/c/${target.club_id}`} replace />;
};

export default HomeRedirect;
