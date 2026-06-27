import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invalidateFrameCache } from '@/hooks/useEquippedFrame';
import { invalidateThemeCache } from '@/hooks/useEquippedTheme';
import { invalidateCosmeticsCache } from '@/hooks/useEquippedCosmetics';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, ChevronUp, Backpack, Check, User } from 'lucide-react';
import ElectricBorder from '@/components/ElectricBorder';
import ChromeBorder from '@/components/ChromeBorder';
import DarkMagicBorder from '@/components/DarkMagicBorder';
import HolographicBorder from '@/components/HolographicBorder';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  item_id: string;
  equipped: boolean;
  shop_items: {
    name: string;
    description: string;
    category: string;
    asset_data: Record<string, any>;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: '🖼️ Frames',
  badge: '🏅 Badges',
  title: '🎭 Titles',
  name_flair: '✨ Flair',
  progress_bar: '📊 Bars',
  theme: '🌙 Themes',
};

interface InventoryWidgetProps {
  userId: string;
  isOwnProfile: boolean;
}

const InventoryWidget = ({ userId, isOwnProfile }: InventoryWidgetProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_inventory')
        .select('id, item_id, equipped, shop_items(name, description, category, asset_data)')
        .eq('user_id', userId);
      setItems((data as any) ?? []);
      setLoading(false);
    };
    load();
  }, [userId, open]);

  const toggleEquip = async (item: InventoryItem) => {
    if (!user || user.id !== userId) return;

    // If equipping, unequip others in same category first
    const category = item.shop_items.category;
    if (!item.equipped) {
      const sameCategory = items.filter(i => i.shop_items.category === category && i.equipped);
      for (const other of sameCategory) {
        await supabase.from('user_inventory').update({ equipped: false }).eq('id', other.id);
      }
    }

    const { error } = await supabase
      .from('user_inventory')
      .update({ equipped: !item.equipped })
      .eq('id', item.id);

    if (error) {
      toast.error('Failed to update');
      return;
    }

    setItems(prev =>
      prev.map(i => {
        if (i.id === item.id) return { ...i, equipped: !item.equipped };
        if (!item.equipped && i.shop_items.category === category && i.id !== item.id) return { ...i, equipped: false };
        return i;
      })
    );
    if (category === 'avatar_frame') invalidateFrameCache(userId);
    if (category === 'theme') invalidateThemeCache();
    invalidateCosmeticsCache(userId);
    toast.success(item.equipped ? `Unequipped "${item.shop_items.name}"` : `Equipped "${item.shop_items.name}"! ✨`);
  };

  const renderPreview = (item: InventoryItem) => {
    const data = item.shop_items.asset_data;
    switch (item.shop_items.category) {
      case 'avatar_frame': {
        const isElectric = data.animation_class === 'animate-electric-border';
        const isChrome = data.animation_class === 'animate-chrome-ring';
        if (isElectric) {
          return (
            <ElectricBorder size="sm">
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </ElectricBorder>
          );
        }
        if (isChrome) {
          return (
            <ChromeBorder size="sm">
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </ChromeBorder>
          );
        }
        const isDarkMagic = data.animation_class === 'animate-dark-magic';
        if (isDarkMagic) {
          return (
            <DarkMagicBorder size="sm">
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </DarkMagicBorder>
          );
        }
        const isHolographic = data.animation_class === 'animate-holographic-ring';
        if (isHolographic) {
          return (
            <HolographicBorder size="sm">
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </HolographicBorder>
          );
        }
        if (data.gradient) {
          return (
            <div
              className="h-10 w-10 rounded-full shrink-0"
              style={{ background: data.gradient, padding: '2px', boxShadow: data.box_shadow || undefined }}
            >
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          );
        }
        return (
          <div
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0"
            style={data.border_style ? Object.fromEntries(data.border_style.split(';').filter(Boolean).map((s: string) => { const [k, ...v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v.join(':').trim()]; })) : undefined}
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        );
      }
      case 'badge': {
        const badgeStyle: React.CSSProperties = {};
        if (data.bg_class === 'bg-amber-100') { badgeStyle.backgroundColor = '#fef3c7'; badgeStyle.color = '#92400e'; badgeStyle.borderColor = '#fcd34d'; }
        else if (data.bg_class === 'bg-rose-100') { badgeStyle.backgroundColor = '#ffe4e6'; badgeStyle.color = '#9f1239'; badgeStyle.borderColor = '#fda4af'; }
        else if (data.bg_class === 'bg-indigo-100') { badgeStyle.backgroundColor = '#e0e7ff'; badgeStyle.color = '#3730a3'; badgeStyle.borderColor = '#a5b4fc'; }
        else if (data.bg_class === 'bg-yellow-100') { badgeStyle.backgroundColor = '#fef9c3'; badgeStyle.color = '#854d0e'; badgeStyle.borderColor = '#fde047'; }
        else if (data.bg_class === 'bg-chrome') { badgeStyle.background = 'linear-gradient(135deg, #b0b0b0, #e0e0e0, #c8c8c8, #d8d8d8)'; badgeStyle.color = '#2a2a2a'; badgeStyle.borderColor = '#a0a0a0'; }
        else if (data.bg_class === 'bg-speed-demon') { badgeStyle.backgroundColor = '#fef2f2'; badgeStyle.color = '#dc2626'; badgeStyle.borderColor = '#fca5a5'; }
        return (
          <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold shrink-0" style={badgeStyle}>
            <span>{data.emoji}</span>
            <span>{data.label}</span>
          </div>
        );
      }
      case 'title':
        return <span className="text-xs italic text-muted-foreground shrink-0">~ {data.title} ~</span>;
      case 'name_flair':
        return (
          <span
            className={`font-display font-bold text-sm shrink-0 ${data.css_class || ''}`}
            style={data.color_style ? Object.fromEntries(data.color_style.split(';').filter(Boolean).map((s: string) => { const [k, ...v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v.join(':').trim()]; })) : undefined}
          >
            Aa
          </span>
        );
      case 'progress_bar':
        return (
          <div className={`progress-bar-watercolor ${data.bar_class || ''} w-16 shrink-0`}>
            <div className="fill" style={{ width: '65%' }} />
          </div>
        );
      default:
        return null;
    }
  };

  // Group by category
  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const cat = item.shop_items.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="cozy-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Backpack className="h-5 w-5 text-terracotta" />
          <h3 className="cozy-title text-xl">Inventory</h3>
          {items.length > 0 && <span className="text-xs text-muted-foreground font-body">({items.length})</span>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground font-body text-center py-4">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body text-center py-4">
              {isOwnProfile ? 'No items yet — visit the Shop to get some! 🛍️' : 'No items yet.'}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 font-body">{CATEGORY_LABELS[cat] || cat}</p>
                  <div className="space-y-2">
                    {catItems.map(item => (
                      <div
                        key={item.id}
                        title={item.shop_items.name}
                        className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${item.equipped ? 'bg-secondary/20 ring-1 ring-secondary/40' : 'bg-cream'}`}
                      >
                        <div className="flex-1 min-w-0 flex items-center">
                          {renderPreview(item)}
                        </div>
                        {isOwnProfile && (
                          <button
                            onClick={() => toggleEquip(item)}
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                              item.equipped
                                ? 'bg-secondary text-secondary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                            }`}
                          >
                            {item.equipped ? <><Check className="inline h-3 w-3 mr-0.5" />Equipped</> : 'Equip'}
                          </button>
                        )}
                        {!isOwnProfile && item.equipped && (
                          <span className="shrink-0 text-xs text-secondary font-semibold">Equipped</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryWidget;
