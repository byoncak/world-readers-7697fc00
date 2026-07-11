
-- Catalog parity with Leevers Readers.
-- Idempotent: inserts skipped if a (category, name) match already exists.
-- Preserves all existing shop_items IDs and any user_inventory rows.

-- ── 1. Rename / align existing items so we don't create near-duplicates ─────
UPDATE public.shop_items
SET name = 'Bookworm 📚',
    asset_data = jsonb_set(asset_data, '{emoji}', '"📚"')
WHERE category = 'badge' AND name = 'Bookworm 🐛';

UPDATE public.shop_items
SET name = 'Player One 🕹️',
    asset_data = jsonb_set(asset_data, '{emoji}', '"🕹️"')
WHERE category = 'badge' AND name = 'Player One 🎮';

UPDATE public.shop_items
SET name = 'Speedster ⚡',
    asset_data = jsonb_set(asset_data, '{label}', '"Speedster"')
WHERE category = 'badge' AND name = 'Speedreader ⚡';

UPDATE public.shop_items
SET name = 'The Page Turner',
    asset_data = jsonb_set(asset_data, '{title}', '"The Page Turner"')
WHERE category = 'title' AND name = 'Page Turner';

UPDATE public.shop_items SET name = 'The Fireside'
WHERE category = 'theme' AND name = 'Fireside Theme';

UPDATE public.shop_items SET name = 'Candlelit Library'
WHERE category = 'theme' AND name = 'Candlelit Theme';

UPDATE public.shop_items SET name = 'Moonlit Garden'
WHERE category = 'theme' AND name = 'Moonlit Theme';

-- ── 2. Insert missing badges (11) ──────────────────────────────────────────
INSERT INTO public.shop_items (category, name, price, description, asset_data)
SELECT * FROM (VALUES
  ('badge','Delulu',            175,'Delusion is the solution',
    '{"bg_class":"bg-rose-100","emoji":"🎪","label":"Delulu"}'::jsonb),
  ('badge','Sage 🌿',            175,'A wise and thoughtful reader',
    '{"bg_class":"bg-emerald-100","border_class":"border-emerald-300","emoji":"🌿","label":"Sage","text_class":"text-emerald-800"}'::jsonb),
  ('badge','Cheerleader 👏',     200,'The ultimate hype person',
    '{"bg_class":"bg-rose-100","border_class":"border-rose-300","emoji":"👏","label":"Cheerleader","text_class":"text-rose-800"}'::jsonb),
  ('badge','Dreamer 🌙',         200,'Lives between the pages',
    '{"bg_class":"bg-violet-100","border_class":"border-violet-300","emoji":"🌙","label":"Dreamer","text_class":"text-violet-800"}'::jsonb),
  ('badge','Unhinged',           200,'Chaotically iconic',
    '{"bg_class":"bg-emerald-100","emoji":"🫠","label":"Unhinged"}'::jsonb),
  ('badge','Big Brain',          225,'Galaxy brain takes only',
    '{"bg_class":"bg-indigo-100","emoji":"🧠","label":"Big Brain"}'::jsonb),
  ('badge','Chef''s Kiss',       225,'Immaculate taste only',
    '{"bg_class":"bg-amber-100","emoji":"🤌","label":"Chef''s Kiss"}'::jsonb),
  ('badge','Cozy Cat 🐱',        225,'Curled up with a good book',
    '{"bg_class":"bg-orange-100","border_class":"border-orange-300","emoji":"🐱","label":"Cozy Cat","text_class":"text-orange-800"}'::jsonb),
  ('badge','Main Character',     250,'Protagonist energy',
    '{"bg_class":"bg-orange-100","emoji":"⚡","label":"Main Character"}'::jsonb),
  ('badge','Stargazer 🔮',       250,'Lost in fictional worlds',
    '{"bg_class":"bg-purple-100","border_class":"border-purple-300","emoji":"🔮","label":"Stargazer","text_class":"text-purple-800"}'::jsonb),
  ('badge','Dragon 🐉',          300,'Devours books whole',
    '{"bg_class":"bg-teal-100","border_class":"border-teal-300","emoji":"🐉","label":"Dragon","text_class":"text-teal-800","variants":[{"bg_class":"bg-teal-100","key":"green","label":"Emerald","swatch":"#5eead4"},{"bg_class":"bg-speed-demon","key":"red","label":"Crimson","swatch":"#dc2626"}]}'::jsonb)
) AS v(category,name,price,description,asset_data)
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_items s
  WHERE s.category = v.category AND s.name = v.name
);

-- ── 3. Insert missing name_flair (1) ───────────────────────────────────────
INSERT INTO public.shop_items (category, name, price, description, asset_data)
SELECT * FROM (VALUES
  ('name_flair','Stargazer Name',200,'A cosmic purple name flair for night sky dreamers',
    '{"color_class":"text-indigo-400","color_style":"color: #818cf8"}'::jsonb)
) AS v(category,name,price,description,asset_data)
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_items s
  WHERE s.category = v.category AND s.name = v.name
);

-- ── 4. Insert missing titles (16) ──────────────────────────────────────────
INSERT INTO public.shop_items (category, name, price, description, asset_data)
SELECT * FROM (VALUES
  ('title','Slow Reader Society',    125,'Quality over speed',                          '{"title":"Slow Reader Society 🐌"}'::jsonb),
  ('title','Spine Cracker',          125,'No mercy for paperbacks',                     '{"title":"Spine Cracker"}'::jsonb),
  ('title','Amaze! 🙌',              150,'Rocky would be proud',                        '{"color":"#c4654a","title":"Amaze! 🙌"}'::jsonb),
  ('title','Caffeine-Powered',       150,'Pages per espresso: classified',              '{"title":"Caffeine-Powered ☕"}'::jsonb),
  ('title','Chief Bookworm',         150,'Leader of the reading pack',                  '{"title":"Chief Bookworm"}'::jsonb),
  ('title','Cozy Reader',            150,'Blanket + tea + book = perfection',           '{"title":"Cozy Reader ☕"}'::jsonb),
  ('title','Discussion Dynamo',      150,'Always has something to say',                 '{"title":"Discussion Dynamo"}'::jsonb),
  ('title','Last-Minute Finisher',   150,'Started it the night before meetup',          '{"title":"Last-Minute Finisher ⏰"}'::jsonb),
  ('title','Speed Demon',            150,'Finished it in one sitting',                  '{"color":"#dc2626","title":"Speed Demon 👹"}'::jsonb),
  ('title','Stratt''s Favorite 🏅',  150,'Hand-picked by the boss herself',             '{"color":"#8b7355","title":"Stratt''s Favorite 🏅"}'::jsonb),
  ('title','Two Books Deep',         150,'Reading three at once, mostly',               '{"title":"Two Books Deep"}'::jsonb),
  ('title','Chapter Goblin',         175,'One more chapter... said 47 chapters ago',    '{"color":"#4a7c3c","title":"Chapter Goblin 📖"}'::jsonb),
  ('title','Emotional Damage',       175,'Cries at every chapter',                      '{"color":"#ec4899","title":"Emotional Damage 😭"}'::jsonb),
  ('title','Plot Psychic',           200,'Called the twist on page 3',                  '{"color":"#9b72cf","title":"Plot Psychic 🔮"}'::jsonb),
  ('title','Reread Royalty',         200,'Same book. Tenth time.',                      '{"color":"#c9a84c","title":"Reread Royalty 👑"}'::jsonb),
  ('title','The Librarian 📚',       200,'Keeper of knowledge',                         '{"color":"#8b6f5e","title":"The Librarian 📚"}'::jsonb)
) AS v(category,name,price,description,asset_data)
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_items s
  WHERE s.category = v.category AND s.name = v.name
);
