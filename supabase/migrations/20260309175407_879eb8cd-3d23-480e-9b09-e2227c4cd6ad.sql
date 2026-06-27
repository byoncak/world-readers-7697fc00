UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{color_style}', '"color: #f59e0b"') WHERE name = 'Golden Name';
UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{color_style}', '"color: #f43f5e"') WHERE name = 'Rose Name';
UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{color_style}', '"color: #06b6d4"') WHERE name = 'Ocean Name';
UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{color_style}', '"color: #10b981"') WHERE name = 'Forest Name';
UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{border_style}', '"border: 3px solid #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.3)"') WHERE name = 'Leaf Wreath';
UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{border_style}', '"border: 3px solid #818cf8; box-shadow: 0 0 8px rgba(129,140,248,0.3)"') WHERE name = 'Starry Night';
UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{border_style}', '"border: 3px solid #d97706; box-shadow: 0 0 8px rgba(217,119,6,0.3)"') WHERE name = 'Coffee Cup';
UPDATE shop_items SET asset_data = jsonb_set(asset_data, '{border_style}', '"border: 3px solid #f43f5e; box-shadow: 0 0 8px rgba(244,63,94,0.3)"') WHERE name = 'Book Stack';