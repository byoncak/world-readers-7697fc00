import { Navigate } from 'react-router-dom';
import { useClub } from '@/contexts/ClubContext';

/** Sends users from "/" to their first club (or the Clubs landing page). */
const HomeRedirect = () => {
  const { memberships, isLoadingMemberships } = useClub();

  console.log('[HomeRedirect]', { isLoadingMemberships, count: memberships.length });

  if (isLoadingMemberships) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  if (memberships.length === 0) {
    console.log('[HomeRedirect] no memberships -> /clubs');
    return <Navigate to="/clubs" replace />;
  }

  const last = typeof window !== 'undefined' ? localStorage.getItem('lastClubId') : null;
  const matchedLast = last ? memberships.find((m) => m.club_id === last) : null;
  if (last && !matchedLast) {
    // Stale key from a club the user no longer belongs to.
    console.log('[HomeRedirect] clearing stale lastClubId', last);
    try { localStorage.removeItem('lastClubId'); } catch {}
  }
  const target = matchedLast ?? memberships[0];
  console.log('[HomeRedirect] -> /c/' + target.club_id);
  return <Navigate to={`/c/${target.club_id}`} replace />;
};

export default HomeRedirect;
