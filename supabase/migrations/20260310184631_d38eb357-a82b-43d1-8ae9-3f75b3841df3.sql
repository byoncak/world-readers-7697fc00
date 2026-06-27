
INSERT INTO public.shop_items (name, description, category, price, active, asset_data) VALUES
(
  'Shiny & Chrome',
  'A gleaming chrome badge for the worthy',
  'badge',
  200,
  true,
  '{"emoji": "⚙️", "label": "Shiny & Chrome", "bg_class": "bg-slate-200", "border_color": "#94a3b8"}'::jsonb
),
(
  'Shiny & Chrome',
  'A radiant chrome frame that gleams around your avatar',
  'avatar_frame',
  300,
  true,
  '{"border_style": "border: 3px solid #c0c0c0; box-shadow: 0 0 8px 2px rgba(192,192,192,0.6), inset 0 0 4px rgba(255,255,255,0.4)"}'::jsonb
);
