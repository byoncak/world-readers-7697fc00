UPDATE shop_items SET asset_data = jsonb_build_object(
  'border_style', 'border: 3px solid #818cf8;',
  'border_class', 'ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-indigo-100',
  'gradient', 'linear-gradient(135deg, #312e81, #6366f1, #818cf8, #312e81)',
  'box_shadow', '0 0 12px rgba(129,140,248,0.4), 0 0 24px rgba(99,102,241,0.2)',
  'animation_class', 'animate-starry-twinkle'
) WHERE id = 'bb358d75-1009-4b98-b00b-0ce2fc73a9b5';