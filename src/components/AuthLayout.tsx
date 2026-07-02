import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/AppHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import MeetingRsvpHud from '@/components/MeetingRsvpHud';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { ClubProvider } from '@/contexts/ClubContext';

const AuthLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  useKeyboardInset();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  // Auth temporarily disabled — auto-signed in as test user via useAuth. Keep loader if still resolving.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  return (
    <ClubProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background cozy-bg-pattern">
        <MeetingRsvpHud />
        <AppHeader />
        <div id="app-scroll-container" className="mobile-nav-offset min-h-0 flex-1 overflow-y-auto overscroll-none">
          {/* Keyed on pathname so navigating feels like turning a page */}
          <div key={location.pathname} className="h-full animate-page-in">
            <Outlet />
          </div>
        </div>
        <MobileBottomNav />
      </div>
    </ClubProvider>
  );
};

export default AuthLayout;
