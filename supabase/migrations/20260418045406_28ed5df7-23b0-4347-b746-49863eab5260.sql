
-- 1) Remove duplicate milestone triggers (keep only the combined one)
DROP TRIGGER IF EXISTS on_reading_progress_milestone ON public.reading_progress;
DROP TRIGGER IF EXISTS on_reading_progress_milestone_insert ON public.reading_progress;

-- 2) Helper: grant an achievement once
CREATE OR REPLACE FUNCTION public.grant_achievement(_user_id uuid, _key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_achievements (user_id, achievement_key)
  VALUES (_user_id, _key)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Ensure dedupe constraint exists
CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_unique_key
  ON public.user_achievements (user_id, achievement_key);

-- 3) Achievements on reading progress: First Chapter, Finisher, Speedreader, Bookworm, Legend
CREATE OR REPLACE FUNCTION public.achievements_on_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total integer;
  _meeting timestamptz;
  _completed_count integer;
BEGIN
  -- First Chapter: any progress update
  IF NEW.current_page > 0 THEN
    PERFORM grant_achievement(NEW.user_id, 'first_chapter');
  END IF;

  SELECT total_pages, meeting_date INTO _total, _meeting
  FROM public.books WHERE id = NEW.book_id;

  IF _total IS NOT NULL AND _total > 0 AND NEW.current_page >= _total THEN
    -- Finisher
    PERFORM grant_achievement(NEW.user_id, 'finisher');

    -- Speedreader: finished before meetup
    IF _meeting IS NOT NULL AND now() < _meeting THEN
      PERFORM grant_achievement(NEW.user_id, 'speedreader');
    END IF;

    -- Bookworm (5) / Legend (10): count distinct fully-read books
    SELECT COUNT(DISTINCT rp.book_id) INTO _completed_count
    FROM public.reading_progress rp
    JOIN public.books b ON b.id = rp.book_id
    WHERE rp.user_id = NEW.user_id
      AND b.total_pages IS NOT NULL
      AND rp.current_page >= b.total_pages;

    IF _completed_count >= 5 THEN
      PERFORM grant_achievement(NEW.user_id, 'bookworm');
    END IF;
    IF _completed_count >= 10 THEN
      PERFORM grant_achievement(NEW.user_id, 'legend');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_achievements_on_progress ON public.reading_progress;
CREATE TRIGGER trg_achievements_on_progress
AFTER INSERT OR UPDATE ON public.reading_progress
FOR EACH ROW EXECUTE FUNCTION public.achievements_on_progress();

-- 4) Conversation Starter: 10 top-level discussions
CREATE OR REPLACE FUNCTION public.achievements_on_discussion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  IF NEW.parent_id IS NULL THEN
    SELECT COUNT(*) INTO _count FROM public.discussions
    WHERE user_id = NEW.user_id AND parent_id IS NULL;
    IF _count >= 10 THEN
      PERFORM grant_achievement(NEW.user_id, 'conversation_starter');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_achievements_on_discussion ON public.discussions;
CREATE TRIGGER trg_achievements_on_discussion
AFTER INSERT ON public.discussions
FOR EACH ROW EXECUTE FUNCTION public.achievements_on_discussion();

-- 5) Cheerleader: cheered 10 different members
CREATE OR REPLACE FUNCTION public.achievements_on_cheer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _distinct integer;
BEGIN
  SELECT COUNT(DISTINCT to_user_id) INTO _distinct
  FROM public.cheers
  WHERE from_user_id = NEW.from_user_id AND to_user_id <> NEW.from_user_id;
  IF _distinct >= 10 THEN
    PERFORM grant_achievement(NEW.from_user_id, 'cheerleader');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_achievements_on_cheer ON public.cheers;
CREATE TRIGGER trg_achievements_on_cheer
AFTER INSERT ON public.cheers
FOR EACH ROW EXECUTE FUNCTION public.achievements_on_cheer();

-- 6) Backfill achievements for existing data
DO $$
DECLARE r record;
BEGIN
  -- First Chapter + Finisher + Speedreader + Bookworm + Legend
  FOR r IN
    SELECT rp.user_id, rp.book_id, rp.current_page, b.total_pages, b.meeting_date
    FROM public.reading_progress rp
    JOIN public.books b ON b.id = rp.book_id
  LOOP
    IF r.current_page > 0 THEN
      PERFORM grant_achievement(r.user_id, 'first_chapter');
    END IF;
    IF r.total_pages IS NOT NULL AND r.current_page >= r.total_pages THEN
      PERFORM grant_achievement(r.user_id, 'finisher');
      IF r.meeting_date IS NOT NULL AND now() < r.meeting_date THEN
        PERFORM grant_achievement(r.user_id, 'speedreader');
      END IF;
    END IF;
  END LOOP;

  -- Bookworm / Legend
  FOR r IN
    SELECT rp.user_id, COUNT(DISTINCT rp.book_id) AS done
    FROM public.reading_progress rp
    JOIN public.books b ON b.id = rp.book_id
    WHERE b.total_pages IS NOT NULL AND rp.current_page >= b.total_pages
    GROUP BY rp.user_id
  LOOP
    IF r.done >= 5 THEN PERFORM grant_achievement(r.user_id, 'bookworm'); END IF;
    IF r.done >= 10 THEN PERFORM grant_achievement(r.user_id, 'legend'); END IF;
  END LOOP;

  -- Conversation Starter
  FOR r IN
    SELECT user_id, COUNT(*) AS c FROM public.discussions
    WHERE parent_id IS NULL GROUP BY user_id
  LOOP
    IF r.c >= 10 THEN PERFORM grant_achievement(r.user_id, 'conversation_starter'); END IF;
  END LOOP;

  -- Cheerleader
  FOR r IN
    SELECT from_user_id, COUNT(DISTINCT to_user_id) AS d FROM public.cheers
    WHERE from_user_id <> to_user_id GROUP BY from_user_id
  LOOP
    IF r.d >= 10 THEN PERFORM grant_achievement(r.from_user_id, 'cheerleader'); END IF;
  END LOOP;
END $$;

-- 7) Clean up the duplicate milestone notifications already created
DELETE FROM public.notifications n
USING (
  SELECT MIN(ctid) AS keep_ctid, user_id, type, title, message, created_at
  FROM public.notifications
  WHERE type = 'reading_milestone'
  GROUP BY user_id, type, title, message, created_at
  HAVING COUNT(*) > 1
) dups
WHERE n.user_id = dups.user_id
  AND n.type = dups.type
  AND n.title = dups.title
  AND n.message = dups.message
  AND n.created_at = dups.created_at
  AND n.ctid <> dups.keep_ctid;
