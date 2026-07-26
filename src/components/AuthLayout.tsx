import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/AppHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
const MeetingRsvpHud = lazy(() => import('@/components/MeetingRsvpHud'));
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { ClubProvider } from '@/contexts/ClubContext';

/** Build a safe encoded ?next value from the current location. */
export const buildAuthNext = (pathname: string, search = '') => {
  const combined = `${pathname}${search}`;
  // Reject anything not a same-origin absolute path.
  if (!combined.startsWith('/') || combined.startsWith('//')) return '/';
  return combined;
};

const AuthLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  useKeyboardInset();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading"
        className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern"
      >
        <div className="book" aria-hidden="true"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  if (!user) {
    const next = buildAuthNext(location.pathname, location.search);
    const authUrl = next === '/' ? '/auth' : `/auth?next=${encodeURIComponent(next)}`;
    return <Navigate to={authUrl} replace />;
  }

  return (
    <ClubProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background cozy-bg-pattern">
        <Suspense fallback={null}><MeetingRsvpHud /></Suspense>
        <AppHeader />
        <div id="app-scroll-container" className="mobile-nav-offset min-h-0 flex-1 overflow-y-auto overscroll-none">
          <Outlet />
        </div>
        <MobileBottomNav />
      </div>
    </ClubProvider>
  );
};

export default AuthLayout;
