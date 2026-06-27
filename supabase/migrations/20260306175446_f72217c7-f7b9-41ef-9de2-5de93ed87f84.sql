
CREATE OR REPLACE FUNCTION public.notify_on_password_reset_request()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
  SELECT ur.user_id, 'password_reset_request',
         '🔑 Password reset request',
         NEW.display_name || ' needs their password reset',
         '/admin',
         NEW.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'moderator');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_password_reset_request
  AFTER INSERT ON public.password_reset_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_password_reset_request();
