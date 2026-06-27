
CREATE OR REPLACE FUNCTION public.points_on_suggestion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  already_awarded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = NEW.user_id
      AND action_type = 'book_suggestion'
      AND created_at::date = CURRENT_DATE
  ) INTO already_awarded;

  IF NOT already_awarded THEN
    PERFORM award_points(NEW.user_id, 15, 'book_suggestion', 'Suggested a book');
  END IF;
  RETURN NEW;
END;
$function$;
