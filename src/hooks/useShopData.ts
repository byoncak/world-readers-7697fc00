import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePoints } from '@/hooks/usePoints';
import { useClub } from '@/contexts/ClubContext';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { equipCosmetic } from '@/lib/equipCosmetic';
import type { ShopItem } from '@/components/shop/ShopPreview';

export const useShopData = (userId: string | undefined) => {
  const { points, refetch: refetchPoints } = usePoints();
  const { clubId } = useClub();
  const { user } = useAuth();
  const { isPrivileged } = useRole();
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<Set<string>>(new Set());
  const [buying, setBuying] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [lastUnlocked, setLastUnlocked] = useState<ShopItem | null>(null);
  // Ref-level mutation lock so rapid pointer events can't slip past the
  // React setState boundary (state updates are batched; a ref is synchronous).
  const purchaseLock = useRef(false);
  const equipLock = useRef<Set<string>>(new Set());
  const isTestUser = user?.email === 'testuser@bookclub.local';
  // Free-shop mode is a privileged-only testing affordance. Regular users
  // flipping localStorage cannot bypass real pricing — the client refuses to
  // take the free path unless the caller is a test user or has an elevated
  // role. RLS remains the ultimate guard; this is defence in depth.
  const freeFlag = typeof window !== 'undefined' && localStorage.getItem('freeShopMode') === 'true';
  const testMode = isTestUser || (freeFlag && isPrivileged);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    const [shopRes, invRes] = await Promise.all([
      supabase.from('shop_items').select('*').eq('active', true).order('price'),
      supabase.from('user_inventory').select('item_id, equipped').eq('user_id', userId),
    ]);
    if (shopRes.error || invRes.error) {
      setError(true);
      setLoading(false);
      return;
    }
    const inv = (invRes.data ?? []) as Array<{ item_id: string; equipped: boolean }>;
    setItems((shopRes.data as ShopItem[]) ?? []);
    setOwned(new Set(inv.map((i) => i.item_id)));
    setEquipped(new Set(inv.filter((i) => i.equipped).map((i) => i.item_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const purchaseItem = useCallback(async (item: ShopItem) => {
    if (!userId) return;
    if (purchaseLock.current) return;
    if (owned.has(item.id)) return;
    purchaseLock.current = true;
    setPurchasing(true);

    try {
      if (testMode) {
        if (!clubId) {
          toast({ title: 'Pick a club first', variant: 'destructive' });
          return;
        }
        const { error } = await supabase
          .from('user_inventory')
          .insert({ user_id: userId, item_id: item.id, club_id: clubId });
        if (error) {
          toast({ title: 'Claim failed', description: error.message, variant: 'destructive' });
          return;
        }
        setOwned((prev) => new Set([...prev, item.id]));
        setLastUnlocked(item);
        return;
      }

      if (!clubId) {
        toast({ title: 'Pick a club first', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.rpc('purchase_shop_item', {
        _user_id: userId,
        _item_id: item.id,
        _club_id: clubId,
      });

      if (error || data === false) {
        toast({
          title: 'Purchase failed',
          description: error?.message || 'Not enough points or already owned',
          variant: 'destructive',
        });
        return;
      }

      setOwned((prev) => new Set([...prev, item.id]));
      setLastUnlocked(item);
      refetchPoints();
      // Reconcile inventory/equipped state from the server to avoid drift.
      load();
    } finally {
      purchaseLock.current = false;
      setPurchasing(false);
    }
  }, [userId, testMode, toast, refetchPoints, clubId, owned, load]);

  const handlePurchase = useCallback(async () => {
    if (!buying) return;
    const item = buying;
    setBuying(null);
    await purchaseItem(item);
  }, [buying, purchaseItem]);

  const handleRelock = useCallback(async (item: ShopItem) => {
    if (!userId) return;
    const { error } = await supabase.from('user_inventory').delete().eq('user_id', userId).eq('item_id', item.id);
    if (error) {
      toast({ title: 'Re-lock failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '🔒 Re-locked', description: `"${item.name}" removed from inventory` });
    setOwned((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    setEquipped((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
  }, [userId, toast]);

  const handleEquip = useCallback(async (item: ShopItem) => {
    if (!userId) return;
    if (equipLock.current.has(item.id)) return;
    equipLock.current.add(item.id);
    try {
      const { ok, error } = await equipCosmetic(userId, item.id, item.category);
      if (!ok) {
        toast({ title: 'Equip failed', description: error, variant: 'destructive' });
        return;
      }
      toast({ title: `Equipped "${item.name}" ✨` });
      // Update local equipped set: this item on, any other same-category off.
      setEquipped((prev) => {
        const n = new Set(prev);
        // Turn off any equipped item in the same category
        for (const id of prev) {
          const other = items.find((i) => i.id === id);
          if (other && other.category === item.category) n.delete(id);
        }
        n.add(item.id);
        return n;
      });
    } finally {
      equipLock.current.delete(item.id);
    }
  }, [userId, toast, items]);

  const clearLastUnlocked = useCallback(() => setLastUnlocked(null), []);

  return {
    items,
    loading,
    error,
    refetch: load,
    owned,
    equipped,
    buying,
    setBuying,
    purchasing,
    points,
    testMode,
    handlePurchase,
    handleRelock,
    handleEquip,
    purchaseItem,
    lastUnlocked,
    clearLastUnlocked,
  };
};
