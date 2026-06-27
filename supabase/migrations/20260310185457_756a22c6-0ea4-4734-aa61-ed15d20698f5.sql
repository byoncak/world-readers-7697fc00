
UPDATE public.shop_items 
SET asset_data = '{"border_style": "border: 3px solid transparent; background-image: linear-gradient(var(--background), var(--background)), linear-gradient(135deg, #c0c0c0, #e8e8e8, #d4a843, #c0c0c0); background-origin: border-box; background-clip: padding-box, border-box; box-shadow: 0 0 10px 2px rgba(192,192,192,0.5)"}'::jsonb 
WHERE name = 'Shiny & Chrome' AND category = 'avatar_frame';
