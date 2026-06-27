import { useState, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EquippedFrame {
  border_style: string;
  gradient?: string;
  box_shadow?: string;
  animation_class?: string;
  /** When set, identifies which variant of a multi-color cosmetic is active (e.g. starry night colors). */
  variant_key?: string;
}

// Cache to avoid re-fetching frames for the same user within a session
const frameCache = new Map<string, EquippedFrame | null>();
const pendingRequests = new Map<string, Promise<EquippedFrame | null>>();

// Global version counter to trigger re-renders on invalidation
let cacheVersion = 0;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const getSnapshot = () => cacheVersion;

export const useEquippedFrame = (userId: string | undefined) => {
  const version = useSyncExternalStore(subscribe, getSnapshot);
  const [frame, setFrame] = useState<EquippedFrame | null>(
    userId ? frameCache.get(userId) ?? null : null
  );

  useEffect(() => {
    if (!userId) return;

    if (frameCache.has(userId)) {
      setFrame(frameCache.get(userId) ?? null);
      return;
    }

    // Deduplicate concurrent requests for same user
    let request = pendingRequests.get(userId);
    if (!request) {
      request = (async () => {
        const { data } = await supabase
          .from('user_inventory')
          .select('selected_variant, shop_items(asset_data, category)')
          .eq('user_id', userId)
          .eq('equipped', true);
        const frameItem = (data as any[])?.find(
          (i: any) => i.shop_items?.category === 'avatar_frame'
        );
        const ad = frameItem?.shop_items?.asset_data;
        const selectedVariantKey: string | null = frameItem?.selected_variant ?? null;

        // If the frame supports variants, apply the chosen one (default = first variant)
        let gradient = ad?.gradient;
        let box_shadow = ad?.box_shadow;
        let variant_key: string | undefined;
        if (Array.isArray(ad?.variants) && ad.variants.length > 0) {
          const chosen =
            ad.variants.find((v: any) => v.key === selectedVariantKey) || ad.variants[0];
          gradient = chosen.gradient || gradient;
          box_shadow = chosen.box_shadow || box_shadow;
          variant_key = chosen.key;
        }

        const result =
          ad?.border_style || gradient || ad?.animation_class || box_shadow
            ? {
                border_style: ad.border_style || '',
                gradient,
                box_shadow,
                animation_class: ad.animation_class,
                variant_key,
              }
            : null;
        frameCache.set(userId, result);
        pendingRequests.delete(userId);
        return result;
      })();
      pendingRequests.set(userId, request);
    }

    request.then(setFrame);
  }, [userId, version]);

  return frame;
};

// Call this to invalidate cache when user equips/unequips
export const invalidateFrameCache = (userId: string) => {
  frameCache.delete(userId);
  pendingRequests.delete(userId);
  cacheVersion++;
  listeners.forEach(cb => cb());
};

export const parseInlineStyle = (styleStr: string): React.CSSProperties =>
  Object.fromEntries(
    styleStr
      .split(';')
      .filter(Boolean)
      .map((s: string) => {
        const [k, ...v] = s.split(':');
        return [
          k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()),
          v.join(':').trim(),
        ];
      })
  );
