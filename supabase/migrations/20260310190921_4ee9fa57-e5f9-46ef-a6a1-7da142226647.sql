
UPDATE public.shop_items 
SET asset_data = '{"border_style": "border: 3px solid #a8a9ad; box-shadow: 0 0 6px 1px rgba(192,192,192,0.5), 0 0 12px 3px rgba(168,169,173,0.3), inset 0 0 3px rgba(255,255,255,0.2)"}'::jsonb 
WHERE name = 'Shiny & Chrome' AND category = 'avatar_frame';

UPDATE public.shop_items 
SET asset_data = '{"emoji": "⚙️", "label": "Shiny & Chrome", "bg_class": "bg-chrome"}'::jsonb 
WHERE name = 'Shiny & Chrome' AND category = 'badge';
