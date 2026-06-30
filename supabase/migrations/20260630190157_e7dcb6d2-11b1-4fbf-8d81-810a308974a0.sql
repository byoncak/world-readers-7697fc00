
-- =====================================================================
-- Per-club apples + shop seed + sample clubs
-- =====================================================================

-- ---------- 1. Seed global shop items (club_id NULL = available everywhere) ----------
INSERT INTO public.shop_items (name, description, category, price, asset_data, active) VALUES
-- Frames
('Cozy Frame', 'A warm, cozy ring around your avatar', 'avatar_frame', 150, '{"ring_class":"ring-4 ring-amber-300"}'::jsonb, true),
('Sage Frame', 'Calm sage ring', 'avatar_frame', 150, '{"ring_class":"ring-4 ring-emerald-300"}'::jsonb, true),
('Lavender Frame', 'Soft lavender ring', 'avatar_frame', 200, '{"ring_class":"ring-4 ring-violet-300"}'::jsonb, true),
('Chrome Ring', 'Polished chrome shimmer', 'avatar_frame', 600, '{"animation_class":"animate-chrome-ring"}'::jsonb, true),
('Electric Frame', 'Crackling electric border', 'avatar_frame', 900, '{"animation_class":"animate-electric-border"}'::jsonb, true),
('Holographic Frame', 'Iridescent holographic ring', 'avatar_frame', 1200, '{"animation_class":"animate-holographic-ring"}'::jsonb, true),
('Dark Magic Frame', 'A swirling dark-magic aura', 'avatar_frame', 1500, '{"animation_class":"animate-dark-magic"}'::jsonb, true),

-- Badges
('Bookworm 🐛', 'For the devoted reader', 'badge', 100, '{"emoji":"🐛","label":"Bookworm","bg_class":"bg-emerald-100"}'::jsonb, true),
('Night Owl 🦉', 'Reads past midnight', 'badge', 150, '{"emoji":"🦉","label":"Night Owl","bg_class":"bg-indigo-100"}'::jsonb, true),
('Coffee Lover ☕', 'Cannot read without it', 'badge', 150, '{"emoji":"☕","label":"Coffee","bg_class":"bg-orange-100"}'::jsonb, true),
('Speedreader ⚡', 'Finishes books fast', 'badge', 250, '{"emoji":"⚡","label":"Speedreader","bg_class":"bg-yellow-100"}'::jsonb, true),
('Player One 🎮', 'Ready Player One', 'badge', 250, '{"emoji":"🎮","label":"Player One","bg_class":"bg-violet-100"}'::jsonb, true),
('Wanderer 🌍', 'Travels through pages', 'badge', 300, '{"emoji":"🌍","label":"Wanderer","bg_class":"bg-teal-100"}'::jsonb, true),

-- Titles
('Page Turner', 'Title under your name', 'title', 120, '{"text":"Page Turner","color":"text-emerald-600"}'::jsonb, true),
('Chapter Champ', 'For the consistent reader', 'title', 180, '{"text":"Chapter Champ","color":"text-amber-600"}'::jsonb, true),
('Plot Whisperer', 'You always see the twist', 'title', 250, '{"text":"Plot Whisperer","color":"text-violet-600"}'::jsonb, true),
('Library Legend', 'The greatest of readers', 'title', 500, '{"text":"Library Legend","color":"text-rose-600"}'::jsonb, true),

-- Name flair
('Sparkle ✨', 'Sparkles around your name', 'name_flair', 200, '{"prefix":"✨","suffix":"✨"}'::jsonb, true),
('Fire 🔥', 'You are on fire', 'name_flair', 200, '{"prefix":"🔥","suffix":"🔥"}'::jsonb, true),
('Hearts 💖', 'A loving touch', 'name_flair', 200, '{"prefix":"💖","suffix":"💖"}'::jsonb, true),
('Stars 🌟', 'A starry signature', 'name_flair', 250, '{"prefix":"🌟","suffix":"🌟"}'::jsonb, true),

-- Progress bars
('Sunset Bar', 'Warm gradient progress bar', 'progress_bar', 200, '{"gradient":"from-orange-400 to-rose-500"}'::jsonb, true),
('Forest Bar', 'Lush green progress bar', 'progress_bar', 200, '{"gradient":"from-emerald-400 to-teal-600"}'::jsonb, true),
('Ocean Bar', 'Deep blue progress bar', 'progress_bar', 250, '{"gradient":"from-sky-400 to-indigo-600"}'::jsonb, true),
('Rainbow Bar', 'A full-spectrum progress bar', 'progress_bar', 400, '{"gradient":"from-rose-400 via-amber-300 to-emerald-400"}'::jsonb, true),

-- Themes
('Cozy Cabin Theme', 'Warm amber-toned theme', 'theme', 500, '{"theme_key":"cozy_cabin"}'::jsonb, true),
('Moonlit Theme', 'Deep blue night theme', 'theme', 500, '{"theme_key":"moonlit"}'::jsonb, true),
('Garden Theme', 'Fresh green theme', 'theme', 500, '{"theme_key":"garden"}'::jsonb, true);

-- ---------- 2. Backfill existing point_transactions with the user's home club ----------
-- (legacy data from the single original club — assign to the existing club)
UPDATE public.point_transactions pt
SET club_id = (SELECT id FROM public.clubs LIMIT 1)
WHERE pt.club_id IS NULL
  AND EXISTS (SELECT 1 FROM public.clubs);

UPDATE public.user_points
SET club_id = (SELECT id FROM public.clubs LIMIT 1)
WHERE club_id IS NULL
  AND EXISTS (SELECT 1 FROM public.clubs);

-- Drop legacy rows that have no club we can attribute them to.
DELETE FROM public.user_points WHERE club_id IS NULL;

-- ---------- 3. Make user_points keyed per (user_id, club_id) ----------
ALTER TABLE public.user_points DROP CONSTRAINT IF EXISTS user_points_pkey;
ALTER TABLE public.user_points ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE public.user_points ADD PRIMARY KEY (user_id, club_id);

-- ---------- 4. award_points now requires _club_id ----------
DROP FUNCTION IF EXISTS public.award_points(uuid, integer, text, text);

CREATE OR REPLACE FUNCTION public.award_points(
  _user_id uuid,
  _amount integer,
  _action_type text,
  _description text DEFAULT '',
  _club_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If no club specified, no-op (we only track per-club apples now).
  IF _club_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_points (user_id, club_id, total_points, lifetime_points, updated_at)
  VALUES (_user_id, _club_id, _amount, GREATEST(_amount, 0), now())
  ON CONFLICT (user_id, club_id) DO UPDATE
  SET total_points    = public.user_points.total_points    + _amount,
      lifetime_points = public.user_points.lifetime_points + GREATEST(_amount, 0),
      updated_at      = now();

  INSERT INTO public.point_transactions (user_id, club_id, amount, action_type, description)
  VALUES (_user_id, _club_id, _amount, _action_type, _description);
END;
$$;

-- ---------- 5. purchase_shop_item is now club-scoped ----------
DROP FUNCTION IF EXISTS public.purchase_shop_item(uuid, uuid);

CREATE OR REPLACE FUNCTION public.purchase_shop_item(
  _user_id uuid,
  _item_id uuid,
  _club_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _price integer;
  _balance integer;
  _already_owned boolean;
BEGIN
  IF _club_id IS NULL THEN RETURN false; END IF;

  SELECT price INTO _price FROM public.shop_items WHERE id = _item_id AND active = true;
  IF _price IS NULL THEN RETURN false; END IF;

  -- Inventory is global — owning it in any club means owning it everywhere.
  SELECT EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = _user_id AND item_id = _item_id) INTO _already_owned;
  IF _already_owned THEN RETURN false; END IF;

  SELECT total_points INTO _balance
  FROM public.user_points
  WHERE user_id = _user_id AND club_id = _club_id;

  IF _balance IS NULL OR _balance < _price THEN RETURN false; END IF;

  PERFORM public.award_points(_user_id, -_price, 'purchase', 'Purchased shop item', _club_id);

  INSERT INTO public.user_inventory (user_id, item_id, club_id) VALUES (_user_id, _item_id, _club_id);

  RETURN true;
END;
$$;

-- ---------- 6. Update point-awarding triggers to pass NEW.club_id ----------
CREATE OR REPLACE FUNCTION public.points_on_cheer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_points(NEW.from_user_id, 10, 'cheer', 'Cheered someone on', NEW.club_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_discussion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    PERFORM public.award_points(NEW.user_id, 15, 'discussion_post', 'Posted a discussion', NEW.club_id);
  ELSE
    PERFORM public.award_points(NEW.user_id, 10, 'discussion_reply', 'Replied to a discussion', NEW.club_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_points(NEW.sender_id, 3, 'dm_sent', 'Sent a direct message', NEW.club_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE already_awarded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = NEW.user_id
      AND action_type = 'reaction'
      AND created_at::date = CURRENT_DATE
      AND description = 'Reacted on discussion ' || NEW.discussion_id
  ) INTO already_awarded;
  IF NOT already_awarded THEN
    PERFORM public.award_points(NEW.user_id, 2, 'reaction', 'Reacted on discussion ' || NEW.discussion_id, NEW.club_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_recommendation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_points(NEW.from_user_id, 10, 'book_recommendation', 'Recommended a book', NEW.club_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 10, 'rsvp', 'RSVPed to a meetup', NEW.club_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_suggestion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE already_awarded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = NEW.user_id
      AND action_type = 'book_suggestion'
      AND club_id = NEW.club_id
      AND created_at::date = CURRENT_DATE
  ) INTO already_awarded;
  IF NOT already_awarded THEN
    PERFORM public.award_points(NEW.user_id, 15, 'book_suggestion', 'Suggested a book', NEW.club_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_suggestion_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 8, 'suggestion_comment', 'Commented on a suggestion', NEW.club_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_vote_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE already_awarded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = NEW.user_id
      AND action_type = 'vote_like'
      AND description = 'Voted on suggestion ' || NEW.suggestion_id
  ) INTO already_awarded;
  IF NOT already_awarded THEN
    PERFORM public.award_points(NEW.user_id, 5, 'vote_like', 'Voted on suggestion ' || NEW.suggestion_id, NEW.club_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.points_on_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  pages_advanced integer;
  already_earned integer;
  book_total integer;
  can_earn integer;
  to_award integer;
BEGIN
  pages_advanced := NEW.current_page - COALESCE(OLD.current_page, 0);
  IF pages_advanced <= 0 THEN RETURN NEW; END IF;

  SELECT total_pages INTO book_total FROM public.books WHERE id = NEW.book_id;
  IF book_total IS NULL OR book_total <= 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO already_earned
  FROM public.point_transactions
  WHERE user_id = NEW.user_id
    AND action_type = 'progress_update'
    AND description LIKE '%' || NEW.book_id::text || '%';

  can_earn := GREATEST(book_total - already_earned, 0);
  to_award := LEAST(pages_advanced, can_earn);

  IF to_award > 0 THEN
    PERFORM public.award_points(
      NEW.user_id,
      to_award,
      'progress_update',
      'Read ' || to_award || ' pages [' || NEW.book_id::text || ']',
      NEW.club_id
    );
  END IF;

  RETURN NEW;
END $$;
