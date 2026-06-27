import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceContext } from '@/contexts/MaintenanceContext';
import { useRole } from '@/hooks/useRole';
import maintenanceImg from '@/assets/maintenance.png.asset.json';
import { LogIn } from 'lucide-react';

const Construction = () => {
  const { enabled, loading: maintenanceLoading, enterApp } = useMaintenanceContext();
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);

  const loading = maintenanceLoading || roleLoading;

  useEffect(() => {
    if (!loading && !enabled) {
      navigate('/', { replace: true });
    }
  }, [loading, enabled, navigate]);

  const handleEnter = () => {
    enterApp();
    navigate('/', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-black">
      <img
        src={maintenanceImg.url}
        alt="Under construction"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Hidden hotspot — only admins can use it (they know it's there). */}
      <button
        onClick={() => setRevealed((v) => !v)}
        aria-label="Hidden corner"
        tabIndex={-1}
        className="absolute bottom-0 right-0 h-10 w-10 opacity-0"
      />
      {revealed && isAdmin && (
        <button
          onClick={handleEnter}
          aria-label="Enter app"
          className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm hover:bg-black/60 hover:text-white transition"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Enter app</span>
        </button>
      )}
    </div>
  );
};

export default Construction;
