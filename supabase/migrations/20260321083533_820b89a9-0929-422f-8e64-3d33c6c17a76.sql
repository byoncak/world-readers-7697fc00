-- Remove duplicate new-member trigger and make notification inserts idempotent
DROP TRIGGER IF EXISTS trg_notify_on_new_member ON public.profiles;

CREATE OR REPLACE FUNCTION public.notify_on_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
BEGIN
  _name := COALESCE(NEW.display_name, 'A new reader');

  INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
  SELECT p.user_id,
         'new_member',
         '✌️✨ ' || _name || ' joined the club!',
         'Say hello and welcome them to the crew! 🎉📚',
         '/profile/' || NEW.user_id,
         NEW.user_id
  FROM public.profiles p
  WHERE p.user_id != NEW.user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = p.user_id
        AND n.type = 'new_member'
        AND n.triggered_by = NEW.user_id
    );

  RETURN NEW;
END;
$function$;