import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePoints } from '@/hooks/usePoints';
import { useClub } from '@/contexts/ClubContext';
import { useAuth } from '@/hooks/useAuth';
import type { ShopItem } from '@/components/shop/ShopPreview';

export const useShopData = (userId: string | undefined) => {
  const { points, refetch: refetchPoints } = usePoints();
  const { clubId } = useClub();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [buying, setBuying] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [lastUnlocked, setLastUnlocked] = useState<ShopItem | null>(null);
  const isTestUser = user?.email === 'testuser@bookclub.local';
  const testMode = isTestUser || localStorage.getItem('freeShopMode') === 'true';

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    const [shopRes, invRes] = await Promise.all([
      supabase.from('shop_items').select('*').eq('active', true).order('price'),
      supabase.from('user_inventory').select('item_id').eq('user_id', userId),
    ]);
    if (shopRes.error || invRes.error) {
      setError(true);
      setLoading(false);
      return;
    }
    setItems((shopRes.data as ShopItem[]) ?? []);
    setOwned(new Set((invRes.data ?? []).map((i: any) => i.item_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const purchaseItem = useCallback(async (item: ShopItem) => {
    if (!userId) return;
    setPurchasing(true);

    if (testMode) {
      const { error } = await supabase.from('user_inventory').insert({ user_id: userId, item_id: item.id, club_id: clubId });
      setPurchasing(false);
      if (error) {
        toast({ title: 'Claim failed', description: error.message, variant: 'destructive' });
        return;
      }
      setOwned(prev => new Set([...prev, item.id]));
      setLastUnlocked(item);
      return;
    }

    if (!clubId) {
      setPurchasing(false);
      toast({ title: 'Pick a club first', variant: 'destructive' });
      return;
    }

    const { data, error } = await supabase.rpc('purchase_shop_item', {
      _user_id: userId,
      _item_id: item.id,
      _club_id: clubId,
    });
    setPurchasing(false);

    if (error || data === false) {
      toast({ title: 'Purchase failed', description: error?.message || 'Not enough points or already owned', variant: 'destructive' });
      return;
    }

    setOwned(prev => new Set([...prev, item.id]));
    setLastUnlocked(item);
    refetchPoints();
  }, [userId, testMode, toast, refetchPoints, clubId]);

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
    setOwned(prev => { const n = new Set(prev); n.delete(item.id); return n; });
  }, [userId, toast]);

  const clearLastUnlocked = useCallback(() => setLastUnlocked(null), []);

  return { items, loading, error, refetch: load, owned, buying, setBuying, purchasing, points, testMode, handlePurchase, handleRelock, purchaseItem, lastUnlocked, clearLastUnlocked };
};
