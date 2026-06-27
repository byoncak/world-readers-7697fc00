import { useMaintenanceContext } from '@/contexts/MaintenanceContext';

export const useMaintenanceMode = () => {
  const { enabled, loading, setMaintenance } = useMaintenanceContext();
  return { enabled, loading, setMaintenance };
};
