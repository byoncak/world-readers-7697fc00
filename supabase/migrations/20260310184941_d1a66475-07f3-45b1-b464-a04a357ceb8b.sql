
UPDATE public.shop_items SET asset_data = '{"border_style": "border: 3px solid #a8a9ad; box-shadow: 0 0 10px 2px rgba(192,192,192,0.5), inset 0 0 4px rgba(255,255,255,0.3); background: linear-gradient(135deg, #c0c0c0, #e8e8e8, #a8a9ad)"}'::jsonb WHERE name = 'Shiny & Chrome' AND category = 'avatar_frame';

UPDATE public.shop_items SET asset_data = '{"emoji": "⚙️", "label": "Shiny & Chrome", "bg_class": "bg-chrome", "border_color": "#a8a9ad"}'::jsonb WHERE name = 'Shiny & Chrome' AND category = 'badge';
