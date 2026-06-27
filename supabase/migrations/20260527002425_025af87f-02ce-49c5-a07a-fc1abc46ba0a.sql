CREATE OR REPLACE FUNCTION public.achievements_on_cheer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total integer;
BEGIN
  SELECT COUNT(*) INTO _total
  FROM public.cheers
  WHERE from_user_id = NEW.from_user_id;

  IF _total >= 30 THEN
    PERFORM grant_achievement(NEW.from_user_id, 'cheerleader');
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: grant cheerleader to anyone who already has 30+ total cheers
INSERT INTO public.user_achievements (user_id, achievement_key)
SELECT from_user_id, 'cheerleader'
FROM public.cheers
GROUP BY from_user_id
HAVING COUNT(*) >= 30
ON CONFLICT DO NOTHING;