INSERT INTO public.shop_items (name, description, category, price, asset_data, active)
VALUES (
  'Shocker',
  'An electrifying avatar frame with animated lightning border',
  'avatar_frame',
  500,
  '{"gradient": "conic-gradient(from 0deg, #ff8c00, #ff6600, #ffaa00, #ff4500, #ff8c00, #ffcc00, #ff6600, #ff8c00)", "box_shadow": "0 0 12px rgba(255,140,0,0.5), 0 0 24px rgba(255,100,0,0.3)", "animation_class": "animate-electric-border", "border_style": ""}'::jsonb,
  true
);