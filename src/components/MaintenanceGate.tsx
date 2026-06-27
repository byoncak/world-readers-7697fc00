import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMaintenanceContext } from '@/contexts/MaintenanceContext';

const MaintenanceGate = () => {
  const { enabled, loading, bypass } = useMaintenanceContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern">
        <div className="book"><div/><div/><div/><div/><div/></div>
      </div>
    );
  }

  if (!enabled) {
    if (location.pathname === '/construction') {
      return <Navigate to="/" replace />;
    }
    return <Outlet />;
  }

  // Auth and the construction page itself are always reachable.
  if (location.pathname === '/auth' || location.pathname === '/construction') {
    return <Outlet />;
  }

  // Admins who clicked the construction-page button can keep browsing this tab.
  if (bypass) return <Outlet />;

  return <Navigate to="/construction" replace />;
};

export default MaintenanceGate;

