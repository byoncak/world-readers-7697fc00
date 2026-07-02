import { User } from 'lucide-react';
import ElectricBorder from '@/components/ElectricBorder';
import ChromeBorder from '@/components/ChromeBorder';
import DarkMagicBorder from '@/components/DarkMagicBorder';
import HolographicBorder from '@/components/HolographicBorder';
import { getThemePreview } from './themePreviews';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  asset_data: Record<string, any>;
}

const parseInlineStyle = (styleStr: string): React.CSSProperties =>
  Object.fromEntries(
    styleStr.split(';').filter(Boolean).map((s: string) => {
      const [k, ...v] = s.split(':');
      return [k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v.join(':').trim()];
    })
  );

const BADGE_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
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
};

const PREVIEW_WRAPPER = "flex flex-col items-center gap-2 mb-3 py-2";
const PREVIEW_BOX = "h-[72px] w-[72px] flex items-center justify-center";

const FramePreview = ({ asset_data }: { asset_data: Record<string, any> }) => {
  const isElectric = asset_data.animation_class === 'animate-electric-border';
  const isChrome = asset_data.animation_class === 'animate-chrome-ring';
  const isDarkMagic = asset_data.animation_class === 'animate-dark-magic';
  const isHolographic = asset_data.animation_class === 'animate-holographic-ring';
  
  if (isElectric) {
    return (
      <div className={PREVIEW_WRAPPER}>
        <div className={PREVIEW_BOX}>
          <div style={{ transform: 'scale(1.25)', transformOrigin: 'center' }}>
            <ElectricBorder size="md">
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
            </ElectricBorder>
          </div>
        </div>
      </div>
    );
  }

  if (isChrome) {
    return (
      <div className={PREVIEW_WRAPPER}>
        <div className={PREVIEW_BOX}>
          <div style={{ transform: 'scale(1.25)', transformOrigin: 'center' }}>
            <ChromeBorder size="md">
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
            </ChromeBorder>
          </div>
        </div>
      </div>
    );
  }

  if (isDarkMagic) {
    return (
      <div className={PREVIEW_WRAPPER}>
        <div className={PREVIEW_BOX}>
          <DarkMagicBorder size="lg">
            <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
          </DarkMagicBorder>
        </div>
      </div>
    );
  }

  if (isHolographic) {
    return (
      <div className={PREVIEW_WRAPPER}>
        <div className={PREVIEW_BOX}>
          <div style={{ transform: 'scale(1.25)', transformOrigin: 'center' }}>
            <HolographicBorder size="md">
              <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
            </HolographicBorder>
          </div>
        </div>
      </div>
    );
  }

  if (asset_data.gradient) {
    return (
      <div className={PREVIEW_WRAPPER}>
        <div className={PREVIEW_BOX}>
          <div
            className={`h-16 w-16 rounded-full ${asset_data.animation_class || ''}`}
            style={{
              background: asset_data.gradient,
              padding: '3px',
              boxShadow: asset_data.box_shadow || undefined,
            }}
          >
            <div className="h-full w-full rounded-full bg-muted flex items-center justify-center relative z-[2]">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={PREVIEW_WRAPPER}>
      <div className={PREVIEW_BOX}>
        <div
          className="h-16 w-16 rounded-full bg-muted flex items-center justify-center"
          style={asset_data.border_style ? parseInlineStyle(asset_data.border_style) : undefined}
        >
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

const BadgePreview = ({ asset_data }: { asset_data: Record<string, any> }) => {
  const badgeStyle: React.CSSProperties = {};
  const mapped = BADGE_COLOR_MAP[asset_data.bg_class];
  if (mapped) {
    const isGradient = mapped.bg.startsWith('linear-gradient');
    if (isGradient) { badgeStyle.background = mapped.bg; } else { badgeStyle.backgroundColor = mapped.bg; }
    badgeStyle.color = mapped.text;
    badgeStyle.borderColor = mapped.border;
  }
  return (
    <div className="flex flex-col items-center gap-2 mb-3 py-2">
      <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold" style={badgeStyle}>
        <span className="text-base">{asset_data.emoji}</span>
        <span>{asset_data.label}</span>
      </div>
    </div>
  );
};

const ShopPreview = ({ item }: { item: ShopItem }) => {
  switch (item.category) {
    case 'avatar_frame':
      return <FramePreview asset_data={item.asset_data} />;
    case 'badge':
      return <BadgePreview asset_data={item.asset_data} />;
    case 'title':
      return (
        <div className="flex flex-col items-center gap-1 mb-3 py-2">
          <span className="font-display font-bold text-sm text-foreground">Your Name</span>
          <span
            className={`text-xs italic ${item.asset_data.color ? '' : 'text-muted-foreground'}`}
            style={item.asset_data.color ? { color: item.asset_data.color } : undefined}
          >
            ~ {item.asset_data.title} ~
          </span>
        </div>
      );
    case 'name_flair':
      return (
        <div className="flex flex-col items-center gap-1 mb-3 py-2">
          <span
            className="font-display font-bold text-lg"
            style={item.asset_data.color_style ? parseInlineStyle(item.asset_data.color_style) : undefined}
          >
            Your Name
          </span>
        </div>
      );
    case 'progress_bar':
      return (
        <div className="flex flex-col items-center gap-2 mb-3 py-2">
          <div className={`progress-bar-watercolor ${item.asset_data.bar_class || ''} w-full`}>
            <div className="fill" style={{ width: '65%' }} />
          </div>
        </div>
      );
    case 'theme': {
      const palette = getThemePreview(
        item.asset_data.theme_key,
        item.asset_data.colors as Record<string, string> | undefined
      );
      if (!palette) return null;
      return (
        <div className="flex flex-col items-center gap-1.5 mb-3 py-1">
          {/* Miniature app "room" rendered in the theme's own palette */}
          <div
            className="w-full max-w-[200px] rounded-xl border p-2.5 shadow-inner"
            style={{ backgroundColor: palette.bg, borderColor: `${palette.primary}33` }}
            aria-hidden
          >
            <div
              className="rounded-lg p-2"
              style={{ backgroundColor: palette.card }}
            >
              <div className="h-2 w-16 rounded-full mb-1.5" style={{ backgroundColor: palette.text, opacity: 0.9 }} />
              <div className="h-1.5 w-24 rounded-full mb-2" style={{ backgroundColor: palette.muted, opacity: 0.6 }} />
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${palette.muted}44` }}>
                <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: palette.primary }} />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-3.5 w-10 rounded-full" style={{ backgroundColor: palette.primary }} />
                <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: palette.accent }} />
              </div>
            </div>
          </div>
          {palette.mood && (
            <p className="text-[11px] italic text-muted-foreground font-serif text-center">{palette.mood}</p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
};

export default ShopPreview;
export type { ShopItem };
