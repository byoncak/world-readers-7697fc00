import { Navigate } from 'react-router-dom';
import { useClub } from '@/contexts/ClubContext';

/** Sends users from "/" to their first club (or the Clubs landing page). */
const HomeRedirect = () => {
  const { memberships, isLoadingMemberships } = useClub();

  if (isLoadingMemberships) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
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
