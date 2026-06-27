
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
  SELECT p.user_id, 'new_member',
         '✌️✨ ' || _name || ' joined the club!',
         'Say hello and welcome them to the crew! 🎉📚',
         '/profile/' || NEW.user_id,
         NEW.user_id
  FROM public.profiles p
  WHERE p.user_id != NEW.user_id;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_member_joined
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_member();
