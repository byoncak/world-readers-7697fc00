-- Update Golden Name flair to include pulse class
UPDATE shop_items SET asset_data = jsonb_set(asset_data::jsonb, '{css_class}', '"gold-name-pulse"')
WHERE id = '07196ba2-2585-4481-add7-f0fcb3019eaf';

-- Add progress bar shop items
INSERT INTO shop_items (name, description, category, price, asset_data, active) VALUES
  ('Rose Bar', 'A warm pink progress bar', 'progress_bar', 100, '{"bar_class": "progress-rose"}', true),
  ('Ocean Bar', 'A cool cyan progress bar', 'progress_bar', 100, '{"bar_class": "progress-ocean"}', true),
  ('Sunset Bar', 'A fiery gradient progress bar', 'progress_bar', 150, '{"bar_class": "progress-sunset"}', true),
  ('Forest Bar', 'A lush green progress bar', 'progress_bar', 150, '{"bar_class": "progress-forest"}', true),
  ('Galaxy Bar', 'A mystical purple progress bar', 'progress_bar', 200, '{"bar_class": "progress-galaxy"}', true);