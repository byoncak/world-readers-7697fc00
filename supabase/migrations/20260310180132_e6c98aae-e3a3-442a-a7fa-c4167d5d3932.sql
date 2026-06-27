CREATE OR REPLACE FUNCTION public.points_on_vote_like()
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
      AND action_type = 'vote_like'
      AND description = 'Voted on suggestion ' || NEW.suggestion_id
  ) INTO already_awarded;

  IF NOT already_awarded THEN
    PERFORM award_points(NEW.user_id, 5, 'vote_like', 'Voted on suggestion ' || NEW.suggestion_id);
  END IF;
  RETURN NEW;
END;
$function$;