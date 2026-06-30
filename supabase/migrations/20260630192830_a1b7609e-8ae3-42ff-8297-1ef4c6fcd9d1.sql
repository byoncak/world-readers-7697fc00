
-- 1) Restore auth.users -> profiles trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 2) Reseed global shop_items so every club sees the same comprehensive shop with metadata
--    that matches what the UI actually renders.

-- Remove only the not-yet-purchased global items, so we can refresh them cleanly.
DELETE FROM public.shop_items s
WHERE s.club_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_inventory ui WHERE ui.item_id = s.id);

-- Avoid duplicate-name conflicts with any items left behind (already-owned).
-- Items below are inserted only if a same-named global item doesn't already exist.

WITH new_items(name, description, category, price, asset_data) AS (
  VALUES
    -- Name flair (color_style + optional css_class)
    ('Golden Name',  'A glowing golden name',         'name_flair', 250, '{"color_style":"color: #f59e0b","css_class":"gold-name-pulse"}'::jsonb),
    ('Rose Name',    'A blushing rose name',          'name_flair', 200, '{"color_style":"color: #f43f5e"}'::jsonb),
    ('Ocean Name',   'A cool cyan name',              'name_flair', 200, '{"color_style":"color: #06b6d4"}'::jsonb),
    ('Forest Name',  'A leafy green name',            'name_flair', 200, '{"color_style":"color: #10b981"}'::jsonb),
    ('Violet Name',  'A regal violet name',           'name_flair', 200, '{"color_style":"color: #8b5cf6"}'::jsonb),
    ('Sunset Name',  'A warm sunset name',            'name_flair', 200, '{"color_style":"color: #f97316"}'::jsonb),

    -- Avatar frames (border_style or animation_class)
    ('Leaf Wreath',  'A bright green nature frame',   'avatar_frame', 200, '{"border_style":"border: 3px solid #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.3)"}'::jsonb),
    ('Starry Night', 'A starry indigo frame',         'avatar_frame', 200, '{"border_style":"border: 3px solid #818cf8; box-shadow: 0 0 8px rgba(129,140,248,0.3)"}'::jsonb),
    ('Coffee Cup',   'A warm coffee-toned frame',     'avatar_frame', 200, '{"border_style":"border: 3px solid #d97706; box-shadow: 0 0 8px rgba(217,119,6,0.3)"}'::jsonb),
    ('Book Stack',   'A rosy book-lover frame',       'avatar_frame', 200, '{"border_style":"border: 3px solid #f43f5e; box-shadow: 0 0 8px rgba(244,63,94,0.3)"}'::jsonb),
    ('Shiny & Chrome','A gleaming chrome frame',      'avatar_frame', 300, '{"border_style":"border: 3px solid #c0c0c0; box-shadow: 0 0 8px 2px rgba(192,192,192,0.6), inset 0 0 4px rgba(255,255,255,0.4)"}'::jsonb),
    ('Chrome Ring',     'Polished chrome shimmer',    'avatar_frame', 600, '{"animation_class":"animate-chrome-ring"}'::jsonb),
    ('Electric Frame',  'Crackling electric border',  'avatar_frame', 900, '{"animation_class":"animate-electric-border"}'::jsonb),
    ('Holographic Frame','Iridescent holographic ring','avatar_frame',1200,'{"animation_class":"animate-holographic-ring"}'::jsonb),
    ('Dark Magic Frame','A swirling dark-magic aura', 'avatar_frame',1500, '{"animation_class":"animate-dark-magic"}'::jsonb),

    -- Badges
    ('Bookworm 🐛',    'For the devoted reader',      'badge', 100, '{"emoji":"🐛","label":"Bookworm","bg_class":"bg-emerald-100"}'::jsonb),
    ('Night Owl 🦉',   'Reads past midnight',         'badge', 150, '{"emoji":"🦉","label":"Night Owl","bg_class":"bg-indigo-100"}'::jsonb),
    ('Coffee Lover ☕','Cannot read without it',      'badge', 150, '{"emoji":"☕","label":"Coffee","bg_class":"bg-orange-100"}'::jsonb),
    ('Speedreader ⚡', 'Finishes books fast',         'badge', 250, '{"emoji":"⚡","label":"Speedreader","bg_class":"bg-yellow-100"}'::jsonb),
    ('Player One 🎮',  'Ready Player One',            'badge', 250, '{"emoji":"🎮","label":"Player One","bg_class":"bg-violet-100"}'::jsonb),
    ('Wanderer 🌍',    'Travels through pages',       'badge', 300, '{"emoji":"🌍","label":"Wanderer","bg_class":"bg-teal-100"}'::jsonb),
    ('Shiny & Chrome', 'A radiant chrome badge',      'badge', 350, '{"emoji":"⚙️","label":"Shiny & Chrome","bg_class":"bg-chrome"}'::jsonb),

    -- Titles
    ('Page Turner',    'Title under your name',       'title', 120, '{"title":"Page Turner","color":"#10b981"}'::jsonb),
    ('Chapter Champ',  'For the consistent reader',   'title', 180, '{"title":"Chapter Champ","color":"#f59e0b"}'::jsonb),
    ('Plot Whisperer', 'You always see the twist',    'title', 250, '{"title":"Plot Whisperer","color":"#8b5cf6"}'::jsonb),
    ('Library Legend', 'The greatest of readers',     'title', 500, '{"title":"Library Legend","color":"#f43f5e"}'::jsonb),

    -- Progress bars (must match CSS classes in src/index.css)
    ('Rose Bar',    'A warm pink progress bar',       'progress_bar', 100, '{"bar_class":"progress-rose"}'::jsonb),
    ('Ocean Bar',   'A cool cyan progress bar',       'progress_bar', 100, '{"bar_class":"progress-ocean"}'::jsonb),
    ('Sunset Bar',  'A fiery sunset progress bar',    'progress_bar', 150, '{"bar_class":"progress-sunset"}'::jsonb),
    ('Forest Bar',  'A lush green progress bar',      'progress_bar', 150, '{"bar_class":"progress-forest"}'::jsonb),
    ('Galaxy Bar',  'A mystical purple progress bar', 'progress_bar', 200, '{"bar_class":"progress-galaxy"}'::jsonb),
    ('Miami Bar',   'A vibrant Miami progress bar',   'progress_bar', 200, '{"bar_class":"progress-miami"}'::jsonb),
    ('Vengeance Bar','A bold red progress bar',       'progress_bar', 250, '{"bar_class":"progress-vengeance"}'::jsonb),
    ('Patriot Bar', 'A stars-and-stripes progress bar','progress_bar',250, '{"bar_class":"progress-patriot"}'::jsonb),
    ('Toxic Bar',   'A glowing toxic progress bar',   'progress_bar', 300, '{"bar_class":"progress-toxic"}'::jsonb),
    ('Adrian Bar',  'A swirling astrophage planet',   'progress_bar', 350, '{"bar_class":"progress-adrian"}'::jsonb),

    -- Themes (must match keys in useEquippedTheme.ts: fireside, moonlit, candlelit)
    ('Fireside Theme', 'A warm, cozy fireside theme', 'theme', 500, '{"theme_key":"fireside"}'::jsonb),
    ('Moonlit Theme',  'A deep blue night theme',     'theme', 500, '{"theme_key":"moonlit"}'::jsonb),
    ('Candlelit Theme','A soft candlelit theme',      'theme', 500, '{"theme_key":"candlelit"}'::jsonb)
)
INSERT INTO public.shop_items (name, description, category, price, asset_data, active, club_id)
SELECT n.name, n.description, n.category, n.price, n.asset_data, true, NULL
FROM new_items n
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_items s
  WHERE s.name = n.name AND s.club_id IS NULL
);
