
-- Direct messages table
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own DMs"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send DMs
CREATE POLICY "Users can send DMs"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can mark received DMs as read
CREATE POLICY "Users can update received DMs"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Users can delete own sent messages
CREATE POLICY "Users can delete own DMs"
  ON public.direct_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Notification trigger for new DMs
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
    '/member/' || NEW.sender_id,
    NEW.sender_id
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_dm
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_dm();
