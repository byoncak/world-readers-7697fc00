
-- Promote Starry Night avatar frame to Legendary tier with the canonical
-- animate-starry-twinkle asset shape (indigo/rose/emerald/gold variants).
-- Forward-only, idempotent: safe to run multiple times, preserves item id
-- and existing ownership. Only touches this single catalog row.
UPDATE public.shop_items
SET
  price = 1000,
  description = 'A legendary midnight ring — twinkling stars orbit your avatar. Choose indigo, rose, emerald, or gold.',
  asset_data = jsonb_build_object(
    'animation_class', 'animate-starry-twinkle',
    'gradient', 'radial-gradient(circle at 30% 30%, #4338ca, #1e1b4b 60%, #0b0a26)',
    'box_shadow', '0 0 12px 2px rgba(129,140,248,0.45), inset 0 0 6px rgba(224,231,255,0.35)',
    'variants', jsonb_build_array(
      jsonb_build_object(
        'key', 'indigo',
        'label', 'Indigo',
        'gradient', 'radial-gradient(circle at 30% 30%, #4338ca, #1e1b4b 60%, #0b0a26)',
        'box_shadow', '0 0 12px 2px rgba(129,140,248,0.45), inset 0 0 6px rgba(224,231,255,0.35)'
      ),
      jsonb_build_object(
        'key', 'rose',
        'label', 'Rose',
        'gradient', 'radial-gradient(circle at 30% 30%, #be185d, #4c0519 60%, #1a0210)',
        'box_shadow', '0 0 12px 2px rgba(251,113,133,0.45), inset 0 0 6px rgba(255,228,230,0.35)'
      ),
      jsonb_build_object(
        'key', 'emerald',
        'label', 'Emerald',
        'gradient', 'radial-gradient(circle at 30% 30%, #047857, #052e2b 60%, #011512)',
        'box_shadow', '0 0 12px 2px rgba(52,211,153,0.45), inset 0 0 6px rgba(209,250,229,0.35)'
      ),
      jsonb_build_object(
        'key', 'gold',
        'label', 'Gold',
        'gradient', 'radial-gradient(circle at 30% 30%, #b45309, #3f2405 60%, #170e02)',
        'box_shadow', '0 0 12px 2px rgba(251,191,36,0.5), inset 0 0 6px rgba(254,243,199,0.4)'
      )
    )
  )
WHERE id = '542a7448-23da-4bc0-a281-0ef67bbc61fa';
