
-- Notify all members when someone adds a new book suggestion
CREATE OR REPLACE FUNCTION public.notify_on_book_suggestion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _poster_name text;
BEGIN
  SELECT COALESCE(display_name, 'A reader') INTO _poster_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
  SELECT p.user_id, 'book_suggestion',
         'New book suggestion',
         _poster_name || ' suggested "' || NEW.suggestion_title || '" by ' || NEW.suggestion_author,
         '/community',
         NEW.user_id
  FROM public.profiles p
  WHERE p.user_id != NEW.user_id;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_book_suggestion_insert
  AFTER INSERT ON public.book_votes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_book_suggestion();

-- Notify recipient of a personal book recommendation
CREATE OR REPLACE FUNCTION public.notify_on_book_recommendation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _sender_name text;
BEGIN
  SELECT COALESCE(display_name, 'A reader') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.from_user_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
  VALUES (
    NEW.to_user_id,
    'book_recommendation',
    'Book recommendation for you',
    _sender_name || ' recommended "' || NEW.title || '" by ' || NEW.author,
    '/profile/' || NEW.to_user_id,
    NEW.from_user_id
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_book_recommendation_insert
  AFTER INSERT ON public.book_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_book_recommendation();

-- Notify user when they hit 50%, 75%, or 100% reading milestones
CREATE OR REPLACE FUNCTION public.notify_on_reading_milestone()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _total_pages integer;
  _book_title text;
  _old_pct integer;
  _new_pct integer;
  _milestone integer;
BEGIN
  SELECT total_pages, title INTO _total_pages, _book_title
  FROM public.books WHERE id = NEW.book_id;

  IF _total_pages IS NULL OR _total_pages <= 0 THEN
    RETURN NEW;
  END IF;

  _new_pct := (NEW.current_page * 100) / _total_pages;

  IF TG_OP = 'UPDATE' THEN
    _old_pct := (OLD.current_page * 100) / _total_pages;
  ELSE
    _old_pct := 0;
  END IF;

  FOREACH _milestone IN ARRAY ARRAY[50, 75, 100] LOOP
    IF _new_pct >= _milestone AND _old_pct < _milestone THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
      VALUES (
        NEW.user_id,
        'reading_milestone',
        _milestone || '% of "' || _book_title || '"!',
        CASE _milestone
          WHEN 50 THEN 'Halfway there! Keep going 📖'
          WHEN 75 THEN 'Almost done! The finish line is in sight 🏁'
          WHEN 100 THEN 'You finished the book! Amazing 🎉'
        END,
        '/',
        NEW.user_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_reading_progress_milestone
  AFTER UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_milestone();

CREATE TRIGGER on_reading_progress_milestone_insert
  AFTER INSERT ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_milestone();
