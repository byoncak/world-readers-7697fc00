CREATE OR REPLACE FUNCTION public.notify_on_dm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sender_name text;
BEGIN
  SELECT COALESCE(display_name, 'Someone') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
  VALUES (
    NEW.receiver_id,
    'direct_message',
    '💬 ' || _sender_name || ' sent you a message',
    LEFT(NEW.message, 100),
    '/inbox?chat=' || NEW.sender_id,
    NEW.sender_id
  );

  RETURN NEW;
END;
$function$;