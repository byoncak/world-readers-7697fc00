UPDATE public.shop_items
SET asset_data = jsonb_set(
  asset_data,
  '{variants}',
  '[
    {"key":"green","label":"Emerald","bg_class":"bg-teal-100","swatch":"#5eead4"},
    {"key":"red","label":"Crimson","bg_class":"bg-speed-demon","swatch":"#dc2626"}
  ]'::jsonb,
  true
)
WHERE id = '8a704a29-2500-4385-9ea9-688c4b340b52';