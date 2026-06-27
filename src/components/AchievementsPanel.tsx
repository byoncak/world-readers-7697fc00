import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invalidateFrameCache } from '@/hooks/useEquippedFrame';
import { invalidateThemeCache } from '@/hooks/useEquippedTheme';
import { invalidateCosmeticsCache } from '@/hooks/useEquippedCosmetics';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, BookOpen, Flag, MessageCircle, Heart, HandMetal, Flame, Zap, Star, Library, Trophy, Check, User, Medal } from 'lucide-react';
import ElectricBorder from '@/components/ElectricBorder';
import ChromeBorder from '@/components/ChromeBorder';
import DarkMagicBorder from '@/components/DarkMagicBorder';
import HolographicBorder from '@/components/HolographicBorder';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from 'sonner';

// ─── Achievements Data ───

interface Achievement {
  key: string;
  icon: React.ElementType;
  name: string;
  description: string;
  color: string;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { key: 'first_chapter', icon: BookOpen, name: 'First Chapter', description: 'Update progress for the first time', color: 'hsl(var(--primary))' },
  { key: 'finisher', icon: Flag, name: 'Finisher', description: 'Complete your first book', color: 'hsl(var(--secondary))' },
  { key: 'first_finisher', icon: Medal, name: 'Gold Medal', description: 'Be the first member to finish a club book. Stacks each time you finish first!', color: 'hsl(45 90% 50%)' },
  { key: 'conversation_starter', icon: MessageCircle, name: 'Conversation Starter', description: 'Post 10 discussions', color: 'hsl(210 70% 55%)' },
  { key: 'thoughtful', icon: Heart, name: 'Thoughtful', description: 'Get 20 reactions on your posts', color: 'hsl(340 65% 55%)' },
  { key: 'cheerleader', icon: HandMetal, name: 'Cheerleader', description: 'Send 30 cheers', color: 'hsl(30 80% 55%)' },
  { key: 'on_fire', icon: Flame, name: 'On Fire', description: '7-day progress update streak', color: 'hsl(15 85% 55%)' },
  { key: 'speedreader', icon: Zap, name: 'Speedreader', description: 'Finish a book before the meetup', color: 'hsl(50 80% 50%)' },
  { key: 'all_star', icon: Star, name: 'All-Star', description: '30-day streak', color: 'hsl(45 90% 50%)' },
  { key: 'bookworm', icon: Library, name: 'Bookworm', description: 'Complete 5 books', color: 'hsl(var(--primary))' },
  { key: 'legend', icon: Trophy, name: 'Legend', description: 'Complete 10 books', color: 'hsl(280 60% 55%)' },
];

// Targets for achievements with measurable progress
const ACHIEVEMENT_TARGETS: Record<string, number> = {
  conversation_starter: 10,
  thoughtful: 20,
  cheerleader: 30,
  on_fire: 7,
  all_star: 30,
  bookworm: 5,
  legend: 10,
};

// ─── StarBurst ───

const StarBurst = ({
  size = 64, points = 12, innerRadius = 0.7, color, children, muted = false,
}: { size?: number; points?: number; innerRadius?: number; color: string; children: React.ReactNode; muted?: boolean; }) => {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2;
  const innerR = outerR * innerRadius;
  const pathPoints: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pathPoints.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <polygon points={pathPoints.join(' ')} fill={muted ? 'hsl(var(--muted))' : color} opacity={muted ? 0.4 : 1} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`flex items-center justify-center rounded-full ${muted ? 'bg-muted/60' : 'bg-card'}`} style={{ width: size * 0.58, height: size * 0.58 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── Inventory types ───

interface InventoryItem {
  id: string;
  item_id: string;
  equipped: boolean;
  selected_variant: string | null;
  shop_items: {
    name: string;
    description: string;
    category: string;
    asset_data: Record<string, any>;
  };
}

interface FrameVariant {
  key: string;
  label: string;
  gradient: string;
  box_shadow?: string;
}

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  avatar_frame: { emoji: '🖼️', label: 'Frame' },
  badge:        { emoji: '🏅', label: 'Badge' },
  title:        { emoji: '🎭', label: 'Title' },
  name_flair:   { emoji: '✨', label: 'Flair' },
  progress_bar: { emoji: '📊', label: 'Bar' },
  theme:        { emoji: '🌙', label: 'Theme' },
};
const CATEGORY_ORDER = ['avatar_frame', 'badge', 'title', 'name_flair', 'progress_bar', 'theme'] as const;

// ─── Inventory Preview (compact) ───

const ItemPreview = ({ item }: { item: InventoryItem }) => {
  const data = item.shop_items.asset_data;
  const variantKey = item.selected_variant ?? (Array.isArray(data?.variants) && data.variants[0]?.key) ?? undefined;
  switch (item.shop_items.category) {
    case 'avatar_frame': {
      if (data.animation_class === 'animate-electric-border') return <ElectricBorder size="sm" variantKey={variantKey}><div className="h-full w-full rounded-full bg-muted flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div></ElectricBorder>;
      if (data.animation_class === 'animate-chrome-ring') return <ChromeBorder size="sm"><div className="h-full w-full rounded-full bg-muted flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div></ChromeBorder>;
      if (data.animation_class === 'animate-dark-magic') return <DarkMagicBorder size="sm"><div className="h-full w-full rounded-full bg-muted flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div></DarkMagicBorder>;
      if (data.animation_class === 'animate-holographic-ring') return <HolographicBorder size="sm"><div className="h-full w-full rounded-full bg-muted flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div></HolographicBorder>;
      if (data.gradient) return (
        <div className="h-10 w-10 rounded-full shrink-0" style={{ background: data.gradient, padding: '2px', boxShadow: data.box_shadow || undefined }}>
          <div className="h-full w-full rounded-full bg-muted flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div>
        </div>
      );
      return <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="h-5 w-5 text-muted-foreground" /></div>;
    }
    case 'badge': {
      const variants = Array.isArray(data?.variants) ? data.variants : [];
      const activeVariant = variants.find((v: any) => v.key === variantKey) ?? null;
      const bgClass = activeVariant?.bg_class ?? data.bg_class;
      const badgeStyle: React.CSSProperties = {};
      if (bgClass === 'bg-amber-100') { badgeStyle.backgroundColor = '#fef3c7'; badgeStyle.color = '#92400e'; badgeStyle.borderColor = '#fcd34d'; }
      else if (bgClass === 'bg-rose-100') { badgeStyle.backgroundColor = '#ffe4e6'; badgeStyle.color = '#9f1239'; badgeStyle.borderColor = '#fda4af'; }
      else if (bgClass === 'bg-indigo-100') { badgeStyle.backgroundColor = '#e0e7ff'; badgeStyle.color = '#3730a3'; badgeStyle.borderColor = '#a5b4fc'; }
      else if (bgClass === 'bg-yellow-100') { badgeStyle.backgroundColor = '#fef9c3'; badgeStyle.color = '#854d0e'; badgeStyle.borderColor = '#fde047'; }
      else if (bgClass === 'bg-teal-100') { badgeStyle.backgroundColor = '#ccfbf1'; badgeStyle.color = '#115e59'; badgeStyle.borderColor = '#5eead4'; }
      else if (bgClass === 'bg-chrome') { badgeStyle.background = 'linear-gradient(135deg, #b0b0b0, #e0e0e0, #c8c8c8, #d8d8d8)'; badgeStyle.color = '#2a2a2a'; badgeStyle.borderColor = '#a0a0a0'; }
      else if (bgClass === 'bg-speed-demon') { badgeStyle.backgroundColor = '#fef2f2'; badgeStyle.color = '#dc2626'; badgeStyle.borderColor = '#fca5a5'; }
      return <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold shrink-0" style={badgeStyle}><span>{data.emoji}</span><span>{data.label}</span></div>;
    }
    case 'title':
      return <span className="text-xs italic text-muted-foreground shrink-0">~ {data.title} ~</span>;
    case 'name_flair':
      return (
        <span
          className={`font-display font-bold text-sm shrink-0 ${data.css_class || ''}`}
          style={data.color_style ? Object.fromEntries(data.color_style.split(';').filter(Boolean).map((s: string) => { const [k, ...v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v.join(':').trim()]; })) : undefined}
        >Aa</span>
      );
    case 'progress_bar':
      return <div className={`progress-bar-watercolor ${data.bar_class || ''} w-16 shrink-0`}><div className="fill" style={{ width: '65%' }} /></div>;
    default:
      return null;
  }
};

// ─── Main Component ───

interface Props {
  userId: string;
  isOwnProfile: boolean;
}

const TABS = [
  { key: 'achievements', emoji: '🏆', label: 'Achievements' },
  { key: 'inventory', emoji: '🎒', label: 'Inventory' },
] as const;

type TabKey = typeof TABS[number]['key'];

const AchievementsPanel = ({ userId, isOwnProfile }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('achievements');
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  // Stacking counts per achievement (e.g. first_finisher → number of books finished first)
  const [stackCounts, setStackCounts] = useState<Record<string, number>>({});
  // Current progress toward locked achievements (own profile only)
  const [progress, setProgress] = useState<Record<string, number>>({});

  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  // Tab indicator
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = TABS.findIndex(t => t.key === tab);
    const el = tabsRef.current[idx];
    if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [tab]);

  // Fetch achievements
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('user_achievements').select('achievement_key').eq('user_id', userId);
      const rows = (data ?? []) as { achievement_key: string }[];
      const set = new Set<string>();
      const counts: Record<string, number> = {};
      for (const r of rows) {
        // Stacking keys are stored as `<base>:<id>` (e.g. first_finisher:<book_id>)
        const base = r.achievement_key.includes(':') ? r.achievement_key.split(':')[0] : r.achievement_key;
        set.add(base);
        counts[base] = (counts[base] ?? 0) + 1;
      }
      setUnlocked(set);
      setStackCounts(counts);
    };
    load();
  }, [userId]);

  // Fetch progress toward locked achievements (own profile only)
  useEffect(() => {
    if (!isOwnProfile) return;
    const loadProgress = async () => {
      const [
        { count: discussionCount },
        { data: myDiscussions },
        { count: cheerCount },
        { data: streakRows },
        { data: completions },
      ] = await Promise.all([
        supabase
          .from('discussions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('parent_id', null),
        supabase.from('discussions').select('id').eq('user_id', userId),
        supabase
          .from('cheers')
          .select('*', { count: 'exact', head: true })
          .eq('from_user_id', userId),
        supabase
          .from('user_streaks')
          .select('streak_type, current_streak')
          .eq('user_id', userId),
        supabase
          .from('reading_progress')
          .select('book_id, current_page, books!inner(total_pages)')
          .eq('user_id', userId),
      ]);

      // Reactions on my posts (excluding self-reactions)
      let reactionCount = 0;
      const ids = (myDiscussions ?? []).map((d: any) => d.id);
      if (ids.length > 0) {
        const { count } = await supabase
          .from('discussion_reactions')
          .select('*', { count: 'exact', head: true })
          .in('discussion_id', ids)
          .neq('user_id', userId);
        reactionCount = count ?? 0;
      }

      const completedBooks = ((completions as any[]) ?? []).filter(
        (r) => r.books?.total_pages && r.current_page >= r.books.total_pages
      ).length;

      const streakMax = ((streakRows as any[]) ?? []).reduce(
        (m, s) => Math.max(m, s.current_streak ?? 0),
        0
      );

      setProgress({
        conversation_starter: discussionCount ?? 0,
        thoughtful: reactionCount,
        cheerleader: cheerCount ?? 0,
        on_fire: streakMax,
        all_star: streakMax,
        bookworm: completedBooks,
        legend: completedBooks,
      });
    };
    loadProgress();
  }, [userId, isOwnProfile]);

  // Fetch inventory when tab switches
  useEffect(() => {
    if (tab !== 'inventory') return;
    const load = async () => {
      setInvLoading(true);
      const { data } = await supabase
        .from('user_inventory')
        .select('id, item_id, equipped, selected_variant, shop_items(name, description, category, asset_data)')
        .eq('user_id', userId);
      setItems((data as any) ?? []);
      setInvLoading(false);
    };
    load();
  }, [userId, tab]);

  const toggleEquip = async (item: InventoryItem) => {
    if (!user || user.id !== userId) return;
    const category = item.shop_items.category;
    if (!item.equipped) {
      const sameCategory = items.filter(i => i.shop_items.category === category && i.equipped);
      for (const other of sameCategory) {
        await supabase.from('user_inventory').update({ equipped: false }).eq('id', other.id);
      }
    }
    const { error } = await supabase.from('user_inventory').update({ equipped: !item.equipped }).eq('id', item.id);
    if (error) { toast.error('Failed to update'); return; }
    setItems(prev => prev.map(i => {
      if (i.id === item.id) return { ...i, equipped: !item.equipped };
      if (!item.equipped && i.shop_items.category === category && i.id !== item.id) return { ...i, equipped: false };
      return i;
    }));
    if (category === 'avatar_frame') invalidateFrameCache(userId);
    if (category === 'theme') invalidateThemeCache();
    invalidateCosmeticsCache(userId);
    toast.success(item.equipped ? `Unequipped "${item.shop_items.name}"` : `Equipped "${item.shop_items.name}"! ✨`);
  };

  const selectVariant = async (item: InventoryItem, variantKey: string) => {
    if (!user || user.id !== userId) return;
    const { error } = await supabase
      .from('user_inventory')
      .update({ selected_variant: variantKey })
      .eq('id', item.id);
    if (error) { toast.error('Failed to update color'); return; }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, selected_variant: variantKey } : i));
    if (item.shop_items.category === 'avatar_frame') invalidateFrameCache(userId);
    invalidateCosmeticsCache(userId);
  };

  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const cat = item.shop_items.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-2">
        {/* Underline-indicator tabs (matches Lounge / Reflect / Shop) */}
        <div className="relative grid grid-cols-2 border-b border-border/50">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              ref={el => { tabsRef.current[i] = el; }}
              onClick={() => setTab(t.key)}
              className={`relative flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-body tracking-wide transition-colors duration-200 ${
                tab === t.key
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
          <span
            className="absolute -bottom-px h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          />
        </div>
      </CardHeader>

      <CardContent>
        {tab === 'achievements' && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ALL_ACHIEVEMENTS.map(a => {
              const isUnlocked = unlocked.has(a.key);
              const stackCount = stackCounts[a.key] ?? 0;
              const Icon = a.icon;
              const target = ACHIEVEMENT_TARGETS[a.key];
              const current = progress[a.key] ?? 0;
              const showProgress = !isUnlocked && isOwnProfile && target !== undefined;
              const tile = (
                <div
                  className={`relative flex flex-col items-center gap-1.5 py-2 text-center transition-transform ${
                    !isUnlocked ? 'opacity-40 grayscale' : 'cursor-pointer hover:scale-105'
                  }`}
                >
                  <div className="relative">
                    <StarBurst size={56} points={12} color={a.color} muted={!isUnlocked}>
                      {isUnlocked ? <Icon className="h-5 w-5" style={{ color: a.color }} /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </StarBurst>
                    {isUnlocked && stackCount >= 2 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold font-body shadow-md ring-2 ring-card"
                        aria-label={`Earned ${stackCount} times`}
                      >
                        {stackCount > 99 ? '99+' : stackCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-foreground leading-tight">
                    {isUnlocked ? a.name : '???'}
                  </span>
                </div>
              );

              if (!isUnlocked) {
                return <div key={a.key}>{tile}</div>;
              }

              return (
                <Popover key={a.key}>
                  <PopoverTrigger asChild>{tile}</PopoverTrigger>
                  <PopoverContent side="top" sideOffset={8} className="w-52 p-3 text-center">
                    <p className="font-display font-bold text-sm mb-1" style={{ color: a.color }}>
                      {a.name}{stackCount >= 2 && <span className="ml-1 text-muted-foreground">×{stackCount}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground font-body leading-snug">{a.description}</p>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        )}

        {tab === 'inventory' && (
          <div>
            {invLoading ? (
              <p className="text-sm text-muted-foreground font-body text-center py-4">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body text-center py-4">
                {isOwnProfile ? 'No items yet — visit the Shop! 🛍️' : 'No items yet.'}
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {CATEGORY_ORDER.map(cat => {
                  const meta = CATEGORY_META[cat];
                  const catItems = grouped[cat] ?? [];
                  const equipped = catItems.find(i => i.equipped) ?? null;
                  const variants: FrameVariant[] = equipped && Array.isArray(equipped.shop_items.asset_data?.variants)
                    ? equipped.shop_items.asset_data.variants
                    : [];
                  const activeVariantKey = equipped?.selected_variant ?? (variants[0]?.key ?? null);
                  const showVariants = isOwnProfile && variants.length > 1;
                  const buttonLabel = catItems.length === 0 ? null : (equipped ? 'Change' : 'Pick');

                  return (
                    <li key={cat} className="flex items-center gap-3 py-2.5">
                      <div className="flex w-24 items-center gap-2 shrink-0">
                        <span className="text-base leading-none">{meta.emoji}</span>
                        <span className="font-body text-sm text-muted-foreground">{meta.label}</span>
                      </div>

                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        {equipped ? (
                          <>
                            <div className="shrink-0"><ItemPreview item={equipped} /></div>
                            <span className="font-body text-sm text-foreground truncate">
                              {equipped.shop_items.name}
                            </span>
                          </>
                        ) : (
                          <span className="font-body text-sm italic text-muted-foreground">— none —</span>
                        )}
                      </div>

                      {isOwnProfile && buttonLabel && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="shrink-0 rounded-full px-3 py-1 text-xs font-body font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                              {buttonLabel}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="left" align="start" sideOffset={8} className="w-64 p-2">
                            <div className="max-h-72 overflow-y-auto">
                              {catItems.map(it => {
                                const isEq = it.equipped;
                                const itVariants: FrameVariant[] = Array.isArray(it.shop_items.asset_data?.variants)
                                  ? it.shop_items.asset_data.variants
                                  : [];
                                return (
                                  <div key={it.id} className="rounded-lg">
                                    <button
                                      onClick={() => toggleEquip(it)}
                                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                        isEq ? 'bg-primary/10' : 'hover:bg-muted/40'
                                      }`}
                                    >
                                      <div className="shrink-0"><ItemPreview item={it} /></div>
                                      <span className="flex-1 font-body text-sm text-foreground truncate">
                                        {it.shop_items.name}
                                      </span>
                                      {isEq && (
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                        </span>
                                      )}
                                    </button>
                                    {isEq && showVariants && it.id === equipped?.id && (
                                      <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
                                        {variants.map(v => {
                                          const isActive = v.key === activeVariantKey;
                                          return (
                                            <button
                                              key={v.key}
                                              type="button"
                                              onClick={() => selectVariant(it, v.key)}
                                              title={v.label}
                                              aria-label={`Use ${v.label} color`}
                                              className={`h-4 w-4 rounded-full transition-transform hover:scale-110 ${
                                                isActive ? 'ring-2 ring-foreground ring-offset-2 ring-offset-popover scale-110' : 'ring-1 ring-border/50'
                                              }`}
                                              style={{ background: v.gradient || (v as any).swatch }}
                                            />
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementsPanel;
