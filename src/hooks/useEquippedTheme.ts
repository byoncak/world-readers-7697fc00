import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const THEME_CLASSES = ['theme-fireside', 'theme-moonlit', 'theme-candlelit'] as const;

export const useEquippedTheme = (userId: string | undefined) => {
  const [themeKey, setThemeKey] = useState<string | null>(null);

  const fetchTheme = useCallback(async () => {
    if (!userId) {
      setThemeKey(null);
      return;
    }

    const { data } = await supabase
      .from('user_inventory')
      .select('shop_items(category, asset_data)')
      .eq('user_id', userId)
      .eq('equipped', true);

    const items = (data as any[]) ?? [];
    const theme = items.find(i => i.shop_items?.category === 'theme');
    setThemeKey(theme?.shop_items?.asset_data?.theme_key ?? null);
  }, [userId]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  useEffect(() => {
    const handler = () => fetchTheme();
    window.addEventListener('theme-equip-changed', handler);
    return () => window.removeEventListener('theme-equip-changed', handler);
  }, [fetchTheme]);

  // Apply theme class directly — no dark mode toggling
  useEffect(() => {
    const root = document.documentElement;
    THEME_CLASSES.forEach(c => root.classList.remove(c));

    if (themeKey) {
      root.classList.add(`theme-${themeKey}`);
    }
  }, [themeKey]);

  return themeKey;
};

export const invalidateThemeCache = () => {
  window.dispatchEvent(new CustomEvent('theme-equip-changed'));
};
