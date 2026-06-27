
-- Create cheers table
CREATE TABLE public.cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  message text NOT NULL,
  preset_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cheers ENABLE ROW LEVEL SECURITY;

-- Authenticated can view all cheers
CREATE POLICY "Authenticated can view cheers" ON public.cheers
  FOR SELECT TO authenticated USING (true);

-- Users can insert own cheers
CREATE POLICY "Users can insert own cheers" ON public.cheers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

-- Notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_cheer()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _sender_name text;
BEGIN
  SELECT COALESCE(display_name, 'A reader') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.from_user_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
  VALUES (
    NEW.to_user_id,
    'cheer',
    '👏 ' || _sender_name || ' cheered you on!',
    NEW.message,
    '/',
    NEW.from_user_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_cheer_insert
  AFTER INSERT ON public.cheers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_cheer();
