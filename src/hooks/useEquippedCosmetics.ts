import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseInlineStyle } from '@/hooks/useEquippedFrame';

export interface BadgeCosmetic {
  emoji: string;
  label: string;
  style: React.CSSProperties;
}

export interface EquippedCosmetics {
  nameFlairStyle?: React.CSSProperties;
  nameFlairClass?: string;
  badge?: BadgeCosmetic;
  title?: string;
  titleColor?: string;
  progressBarClass?: string;
}

// Cache version - bump to invalidate stale data
const CACHE_VERSION = 4;
const cache = new Map<string, { v: number; data: EquippedCosmetics | null }>();
const pending = new Map<string, Promise<EquippedCosmetics | null>>();

function getCached(userId: string): EquippedCosmetics | null | undefined {
  const entry = cache.get(userId);
  if (entry && entry.v === CACHE_VERSION) return entry.data;
  cache.delete(userId);
  return undefined;
}
function setCache(userId: string, data: EquippedCosmetics | null) {
  cache.set(userId, { v: CACHE_VERSION, data });
}

const badgeColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'bg-amber-100': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'bg-rose-100': { bg: '#ffe4e6', text: '#9f1239', border: '#fda4af' },
  'bg-indigo-100': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  'bg-yellow-100': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  'bg-emerald-100': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  'bg-purple-100': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  'bg-orange-100': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  'bg-teal-100': { bg: '#ccfbf1', text: '#115e59', border: '#5eead4' },
  'bg-stone-100': { bg: '#f5f5f4', text: '#44403c', border: '#d6d3d1' },
  'bg-violet-100': { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  'bg-chrome': { bg: 'linear-gradient(135deg, #b0b0b0, #e0e0e0, #c8c8c8, #d8d8d8)', text: '#2a2a2a', border: '#a0a0a0' },
  'bg-speed-demon': { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
};

function resolveBadgeStyle(ad: any, selectedVariant?: string | null): React.CSSProperties {
  const variants = Array.isArray(ad?.variants) ? ad.variants : [];
  const activeVariant =
    variants.find((v: any) => v.key === selectedVariant) ?? variants[0] ?? null;
  const bgKey = activeVariant?.bg_class ?? ad.bg_class ?? '';
  const mapped = badgeColorMap[bgKey];
  if (mapped) {
    const isGradient = mapped.bg.startsWith('linear-gradient') || mapped.bg.startsWith('radial-gradient');
    return { [isGradient ? 'background' : 'backgroundColor']: mapped.bg, color: mapped.text, borderColor: mapped.border };
  }
  return {};
}

export const useEquippedCosmetics = (userId: string | undefined) => {
  const [cosmetics, setCosmetics] = useState<EquippedCosmetics | null>(
    userId ? getCached(userId) ?? null : null
  );

  useEffect(() => {
    if (!userId) return;

    const cached = getCached(userId);
    if (cached !== undefined) {
      setCosmetics(cached);
      return;
    }

    let req = pending.get(userId);
    if (!req) {
      req = (async () => {
        const { data } = await supabase
          .from('user_inventory')
          .select('selected_variant, shop_items(category, asset_data)')
          .eq('user_id', userId)
          .eq('equipped', true);

        const items = (data as any[]) ?? [];
        const result: EquippedCosmetics = {};

        for (const i of items) {
          const cat = i.shop_items?.category;
          const ad = i.shop_items?.asset_data;
          if (!cat || !ad) continue;

          if (cat === 'name_flair' && ad.color_style) {
            result.nameFlairStyle = parseInlineStyle(ad.color_style);
            if (ad.css_class) {
              result.nameFlairClass = ad.css_class;
              // Add base text-shadow for glow effects so it's visible even without CSS animation
              if (ad.css_class === 'gold-name-pulse') {
                result.nameFlairStyle.textShadow = '0 0 8px rgba(245, 158, 11, 0.5), 0 0 16px rgba(245, 158, 11, 0.25)';
              }
            }
          } else if (cat === 'badge' && ad.label) {
            result.badge = {
              emoji: ad.emoji || '',
              label: ad.label,
              style: resolveBadgeStyle(ad, i.selected_variant),
            };
          } else if (cat === 'title' && ad.title) {
            result.title = ad.title;
            if (ad.color) result.titleColor = ad.color;
          } else if (cat === 'progress_bar' && ad.bar_class) {
            result.progressBarClass = ad.bar_class;
          }
        }

        

        const final = Object.keys(result).length > 0 ? result : null;
        setCache(userId, final);
        pending.delete(userId);
        return final;
      })();
      pending.set(userId, req);
    }

    req.then(setCosmetics);
  }, [userId]);

  return cosmetics;
};

export const invalidateCosmeticsCache = (userId: string) => {
  cache.delete(userId);
};

/**
 * Warm the cache with equipped-cosmetics rows already fetched in bulk by a
 * parent widget (e.g. CurrentBookWidget). Pass the full list of user IDs so
 * users with no equipped items get a `null` cache entry and don't re-query.
 *
 * `inventoryRows` should be the raw response from:
 *   supabase.from('user_inventory')
 *     .select('user_id, shop_items(category, asset_data)')
 *     .in('user_id', userIds).eq('equipped', true)
 */
export function prefetchEquippedCosmetics(userIds: string[], inventoryRows: any[]) {
  const grouped = new Map<string, any[]>();
  for (const row of inventoryRows) {
    if (!row?.user_id) continue;
    const arr = grouped.get(row.user_id) ?? [];
    arr.push(row);
    grouped.set(row.user_id, arr);
  }

  for (const userId of userIds) {
    // Skip users that already have a fresh cache entry.
    if (getCached(userId) !== undefined) continue;

    const items = grouped.get(userId) ?? [];
    const result: EquippedCosmetics = {};

    for (const i of items) {
      const cat = i.shop_items?.category;
      const ad = i.shop_items?.asset_data;
      if (!cat || !ad) continue;

      if (cat === 'name_flair' && ad.color_style) {
        result.nameFlairStyle = parseInlineStyle(ad.color_style);
        if (ad.css_class) {
          result.nameFlairClass = ad.css_class;
          if (ad.css_class === 'gold-name-pulse') {
            result.nameFlairStyle.textShadow =
              '0 0 8px rgba(245, 158, 11, 0.5), 0 0 16px rgba(245, 158, 11, 0.25)';
          }
        }
      } else if (cat === 'badge' && ad.label) {
        result.badge = {
          emoji: ad.emoji || '',
          label: ad.label,
          style: resolveBadgeStyle(ad, i.selected_variant),
        };
      } else if (cat === 'title' && ad.title) {
        result.title = ad.title;
        if (ad.color) result.titleColor = ad.color;
      } else if (cat === 'progress_bar' && ad.bar_class) {
        result.progressBarClass = ad.bar_class;
      }
    }

    setCache(userId, Object.keys(result).length > 0 ? result : null);
  }
}
