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
  IF pages_advanced <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT total_pages INTO book_total
  FROM public.books WHERE id = NEW.book_id;

  IF book_total IS NULL OR book_total <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO already_earned
  FROM public.point_transactions
  WHERE user_id = NEW.user_id
    AND action_type = 'progress_update'
    AND description LIKE '%' || NEW.book_id::text || '%';

  can_earn := GREATEST(book_total - already_earned, 0);
  to_award := LEAST(pages_advanced, can_earn);

  IF to_award > 0 THEN
    PERFORM award_points(
      NEW.user_id,
      to_award,
      'progress_update',
      'Read ' || to_award || ' pages [' || NEW.book_id::text || ']'
    );
  END IF;

  RETURN NEW;
END;
$$;