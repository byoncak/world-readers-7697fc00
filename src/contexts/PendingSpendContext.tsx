import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PendingSpendContextValue {
  pendingSpend: number;
  addPending: (n?: number) => void;
  removePending: (n?: number) => void;
  reset: () => void;
}

const PendingSpendContext = createContext<PendingSpendContextValue>({
  pendingSpend: 0,
  addPending: () => {},
  removePending: () => {},
  reset: () => {},
});

export const PendingSpendProvider = ({ children }: { children: ReactNode }) => {
  const [pendingSpend, setPendingSpend] = useState(0);

  const addPending = useCallback((n: number = 1) => {
    setPendingSpend((p) => p + n);
  }, []);

  const removePending = useCallback((n: number = 1) => {
    setPendingSpend((p) => Math.max(0, p - n));
  }, []);

  const reset = useCallback(() => setPendingSpend(0), []);

  return (
    <PendingSpendContext.Provider value={{ pendingSpend, addPending, removePending, reset }}>
      {children}
    </PendingSpendContext.Provider>
  );
};

export const usePendingSpend = () => useContext(PendingSpendContext);
