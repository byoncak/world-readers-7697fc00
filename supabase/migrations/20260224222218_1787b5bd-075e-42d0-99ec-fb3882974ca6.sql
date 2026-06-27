
-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_by uuid
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function to create notifications on new discussions
CREATE OR REPLACE FUNCTION public.notify_on_discussion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _book_title text;
  _poster_name text;
  _parent_author_id uuid;
BEGIN
  SELECT title INTO _book_title FROM public.books WHERE id = NEW.book_id;
  SELECT COALESCE(display_name, 'A reader') INTO _poster_name FROM public.profiles WHERE user_id = NEW.user_id;

  IF NEW.parent_id IS NULL THEN
    -- New top-level post: notify all other members
    INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
    SELECT p.user_id, 'discussion_post',
           'New discussion post',
           _poster_name || ' shared a thought on "' || COALESCE(_book_title, 'a book') || '"',
           '/community',
           NEW.user_id
    FROM public.profiles p
    WHERE p.user_id != NEW.user_id;
  ELSE
    -- Reply: notify the parent post author
    SELECT user_id INTO _parent_author_id FROM public.discussions WHERE id = NEW.parent_id;

    IF _parent_author_id IS NOT NULL AND _parent_author_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
      VALUES (
        _parent_author_id,
        'discussion_reply',
        'Reply to your post',
        _poster_name || ' replied to your discussion on "' || COALESCE(_book_title, 'a book') || '"',
        '/community',
        NEW.user_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_discussion_insert
  AFTER INSERT ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_discussion();
