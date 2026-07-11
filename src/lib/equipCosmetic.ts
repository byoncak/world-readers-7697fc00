import { supabase } from '@/integrations/supabase/client';
import { invalidateFrameCache } from '@/hooks/useEquippedFrame';
import { invalidateThemeCache } from '@/hooks/useEquippedTheme';
import { invalidateCosmeticsCache } from '@/hooks/useEquippedCosmetics';

interface InvRow {
  id: string;
  item_id: string;
  equipped: boolean;
  shop_items: { category: string } | null;
}

/**
 * Equips the given inventory item for `userId`, unequipping anything else in
 * the same category. Returns { ok, error }. Uses server-side RLS-scoped
 * updates only — no client-side trust of ownership.
 */
export async function equipCosmetic(userId: string, itemId: string, category: string): Promise<{ ok: boolean; error?: string }> {
  const { data: rows, error: readErr } = await supabase
    .from('user_inventory')
    .select('id, item_id, equipped, shop_items(category)')
    .eq('user_id', userId);
  if (readErr) return { ok: false, error: readErr.message };

  const inventory = (rows ?? []) as unknown as InvRow[];
  const mine = inventory.find((r) => r.item_id === itemId);
  if (!mine) return { ok: false, error: "Not in your inventory" };

  const sameCategoryEquipped = inventory.filter(
    (r) => r.shop_items?.category === category && r.equipped && r.id !== mine.id,
  );
  for (const other of sameCategoryEquipped) {
    await supabase.from('user_inventory').update({ equipped: false }).eq('id', other.id);
  }
  const { error } = await supabase.from('user_inventory').update({ equipped: true }).eq('id', mine.id);
  if (error) return { ok: false, error: error.message };

  if (category === 'avatar_frame') invalidateFrameCache(userId);
  if (category === 'theme') invalidateThemeCache();
  invalidateCosmeticsCache(userId);
  return { ok: true };
}
