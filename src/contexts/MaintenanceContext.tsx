import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceContextType {
  enabled: boolean;
  loading: boolean;
  setMaintenance: (next: boolean) => Promise<{ error: Error | null }>;
  bypass: boolean;
  enterApp: () => void;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bypass, setBypass] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchFlag = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (!mounted) return;
      setEnabled(!!(data?.value as { enabled?: boolean } | null)?.enabled);
      setLoading(false);
    };

    fetchFlag();

    const channel = supabase
      .channel('app_settings_maintenance')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.maintenance_mode' },
        (payload) => {
          const v = (payload.new as { value?: { enabled?: boolean } } | null)?.value?.enabled;
          setEnabled(!!v);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset any admin bypass as soon as maintenance mode is turned back on.
  useEffect(() => {
    if (enabled) setBypass(false);
  }, [enabled]);

  const setMaintenance = useCallback(async (next: boolean) => {
    // Server-authoritative: the RPC checks is_super_user(auth.uid()) and
    // returns false for anyone else. RLS on app_settings also rejects direct
    // writes.
    const { data, error } = await supabase.rpc('set_maintenance_mode', { _enabled: next });
    if (error) return { error: error as unknown as Error };
    if (data !== true) return { error: new Error('Only the super user can change maintenance mode.') };
    setEnabled(next);
    return { error: null };
  }, []);

  const enterApp = useCallback(() => setBypass(true), []);

  return (
    <MaintenanceContext.Provider value={{ enabled, loading, setMaintenance, bypass, enterApp }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenanceContext = () => {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) throw new Error('useMaintenanceContext must be used within a MaintenanceProvider');
  return ctx;
};
