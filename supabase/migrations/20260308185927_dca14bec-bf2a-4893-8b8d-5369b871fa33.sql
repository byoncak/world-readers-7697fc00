
CREATE OR REPLACE FUNCTION public.notify_rsvp_poll_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meeting_rsvp_active = true AND OLD.meeting_rsvp_active = false THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT 
      p.user_id,
      'rsvp_poll',
      '📅 Attendance Poll is Live!',
      'The meetup poll for "' || NEW.title || '" is open — let us know if you''re joining!',
      '/'
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$;
