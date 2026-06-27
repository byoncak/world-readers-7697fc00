
UPDATE public.shop_items 
SET asset_data = '{"border_style": "border: 3px solid transparent", "gradient": "linear-gradient(135deg, #b0b0b0, #e8e8e8, #a8a9ad, #d0d0d0, #b0b0b0)", "box_shadow": "0 0 6px 1px rgba(192,192,192,0.5), 0 0 12px 3px rgba(168,169,173,0.3)"}'::jsonb 
WHERE name = 'Shiny & Chrome' AND category = 'avatar_frame';
