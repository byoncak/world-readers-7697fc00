-- 1) Add selected_variant column to user_inventory for cosmetic variations
ALTER TABLE public.user_inventory
ADD COLUMN IF NOT EXISTS selected_variant text;

-- 2) Update achievements_on_progress trigger to grant a per-book "first_finisher" achievement
--    when the user is the first to reach 100% on a club book.
CREATE OR REPLACE FUNCTION public.achievements_on_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total integer;
  _meeting timestamptz;
  _completed_count integer;
  _already_finished boolean;
  _was_already_done boolean;
BEGIN
  -- First Chapter: any progress update
  IF NEW.current_page > 0 THEN
    PERFORM grant_achievement(NEW.user_id, 'first_chapter');
  END IF;

  SELECT total_pages, meeting_date INTO _total, _meeting
  FROM public.books WHERE id = NEW.book_id;

  IF _total IS NOT NULL AND _total > 0 AND NEW.current_page >= _total THEN
    -- Was the user already at 100% before this update? If so, skip first-finisher logic.
    _was_already_done := (TG_OP = 'UPDATE' AND OLD.current_page >= _total);

    -- Finisher
    PERFORM grant_achievement(NEW.user_id, 'finisher');

    -- Speedreader: finished before meetup
    IF _meeting IS NOT NULL AND now() < _meeting THEN
      PERFORM grant_achievement(NEW.user_id, 'speedreader');
    END IF;

    -- First Finisher: first member to reach 100% on this book
    IF NOT _was_already_done THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.reading_progress rp
        WHERE rp.book_id = NEW.book_id
          AND rp.user_id <> NEW.user_id
          AND rp.current_page >= _total
      ) INTO _already_finished;

      IF NOT _already_finished THEN
        -- Use a per-book key so users can stack multiple first-finishes
        INSERT INTO public.user_achievements (user_id, achievement_key)
        VALUES (NEW.user_id, 'first_finisher:' || NEW.book_id::text)
        ON CONFLICT DO NOTHING;
      END IF;
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
$function$;

-- 3) Backfill: award first_finisher retroactively to whoever finished each book first.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (rp.book_id)
      rp.book_id, rp.user_id
    FROM public.reading_progress rp
    JOIN public.books b ON b.id = rp.book_id
    WHERE b.total_pages IS NOT NULL
      AND b.total_pages > 0
      AND rp.current_page >= b.total_pages
    ORDER BY rp.book_id, rp.last_updated ASC
  LOOP
    INSERT INTO public.user_achievements (user_id, achievement_key)
    VALUES (r.user_id, 'first_finisher:' || r.book_id::text)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;