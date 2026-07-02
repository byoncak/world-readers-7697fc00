/**
 * Preview palettes for shop themes, keyed by theme_key.
 *
 * These mirror the token blocks in src/index.css so the shop can render a
 * faithful mini-preview without needing colors duplicated in the database.
 * (DB `asset_data.colors` is used as a fallback for custom/admin themes.)
 */

export interface ThemePreviewPalette {
  bg: string;
  card: string;
  primary: string;
  accent: string;
  text: string;
  muted: string;
  /** One-line mood used as the preview caption. */
  mood: string;
}

export const THEME_PREVIEWS: Record<string, ThemePreviewPalette> = {
  fireside: {
    bg: 'hsl(28 22% 11%)',
    card: 'hsl(28 24% 14%)',
    primary: 'hsl(18 52% 52%)',
    accent: 'hsl(272 22% 30%)',
    text: 'hsl(36 28% 88%)',
    muted: 'hsl(32 16% 56%)',
    mood: 'Embers and a wool blanket',
  },
  moonlit: {
    bg: 'hsl(220 18% 12%)',
    card: 'hsl(218 20% 16%)',
    primary: 'hsl(155 35% 48%)',
    accent: 'hsl(260 20% 35%)',
    text: 'hsl(210 20% 90%)',
    muted: 'hsl(200 12% 55%)',
    mood: 'Reading by the window at night',
  },
  candlelit: {
    bg: 'hsl(300 12% 10%)',
    card: 'hsl(310 14% 14%)',
    primary: 'hsl(350 42% 52%)',
    accent: 'hsl(38 30% 32%)',
    text: 'hsl(20 22% 88%)',
    muted: 'hsl(290 8% 52%)',
    mood: 'One candle, one more chapter',
  },
  'midnight-library': {
    bg: 'hsl(222 24% 9%)',
    card: 'hsl(222 22% 12%)',
    primary: 'hsl(40 55% 55%)',
    accent: 'hsl(355 32% 30%)',
    text: 'hsl(40 30% 88%)',
    muted: 'hsl(220 12% 58%)',
    mood: 'Brass lamps and leather spines',
  },
  'deep-forest': {
    bg: 'hsl(160 22% 8%)',
    card: 'hsl(158 20% 11%)',
    primary: 'hsl(32 62% 54%)',
    accent: 'hsl(80 24% 28%)',
    text: 'hsl(90 18% 88%)',
    muted: 'hsl(130 10% 56%)',
    mood: 'Lantern light in a pine cabin',
  },
  'velvet-dusk': {
    bg: 'hsl(275 18% 10%)',
    card: 'hsl(278 17% 13%)',
    primary: 'hsl(335 45% 62%)',
    accent: 'hsl(38 40% 40%)',
    text: 'hsl(320 18% 89%)',
    muted: 'hsl(290 10% 58%)',
    mood: 'A plum armchair at last light',
  },
};

export function getThemePreview(
  themeKey: string | undefined,
  fallbackColors?: Record<string, string>
): ThemePreviewPalette | null {
  if (themeKey && THEME_PREVIEWS[themeKey]) return THEME_PREVIEWS[themeKey];
  if (fallbackColors?.bg && fallbackColors?.primary) {
    return {
      bg: fallbackColors.bg,
      card: fallbackColors.card ?? fallbackColors.bg,
      primary: fallbackColors.primary,
      accent: fallbackColors.accent ?? fallbackColors.primary,
      text: fallbackColors.text ?? '#eee',
      muted: fallbackColors.muted ?? fallbackColors.text ?? '#999',
      mood: '',
    };
  }
  return null;
}
