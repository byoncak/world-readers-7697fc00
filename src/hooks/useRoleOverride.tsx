import { createContext, useContext, useState, ReactNode } from 'react';
import { AppRole } from './useRole';

interface RoleOverrideContextType {
  overrideRole: AppRole | null;
  setOverrideRole: (role: AppRole | null) => void;
  hudVisible: boolean;
  setHudVisible: (visible: boolean) => void;
}

const RoleOverrideContext = createContext<RoleOverrideContextType>({
  overrideRole: null,
  setOverrideRole: () => {},
  hudVisible: false,
  setHudVisible: () => {},
});

export const RoleOverrideProvider = ({ children }: { children: ReactNode }) => {
  const [overrideRole, setOverrideRole] = useState<AppRole | null>(null);
  const [hudVisible, setHudVisible] = useState(false);

  // Reset override when HUD is hidden
  const handleSetHudVisible = (visible: boolean) => {
    setHudVisible(visible);
    if (!visible) setOverrideRole(null);
  };

  return (
    <RoleOverrideContext.Provider value={{ overrideRole, setOverrideRole, hudVisible, setHudVisible: handleSetHudVisible }}>
      {children}
    </RoleOverrideContext.Provider>
  );
};

export const useRoleOverride = () => useContext(RoleOverrideContext);
