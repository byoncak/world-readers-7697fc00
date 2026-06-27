
-- Trigger function to notify mentioned users in discussions
CREATE OR REPLACE FUNCTION public.notify_on_mention_discussion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _poster_name text;
  _book_title text;
  _mentioned_id uuid;
  _mention_match text[];
  _message_text text;
BEGIN
  SELECT COALESCE(display_name, 'A reader') INTO _poster_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  SELECT COALESCE(title, 'a book') INTO _book_title
  FROM public.books WHERE id = NEW.book_id;

  _message_text := NEW.message;

  -- Extract all @[Name](userId) patterns
  FOR _mention_match IN
    SELECT regexp_matches(_message_text, '@\[([^\]]+)\]\(([a-f0-9-]+)\)', 'g')
  LOOP
    _mentioned_id := _mention_match[2]::uuid;

    -- Don't notify yourself
    IF _mentioned_id != NEW.user_id THEN
      -- Check user exists
      IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _mentioned_id) THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
        VALUES (
          _mentioned_id,
          'mention',
          _poster_name || ' mentioned you',
          _poster_name || ' mentioned you in a discussion on "' || _book_title || '"',
          '/community',
          NEW.user_id
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger function to notify mentioned users in DMs
CREATE OR REPLACE FUNCTION public.notify_on_mention_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sender_name text;
  _mentioned_id uuid;
  _mention_match text[];
BEGIN
  SELECT COALESCE(display_name, 'Someone') INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

  FOR _mention_match IN
    SELECT regexp_matches(NEW.message, '@\[([^\]]+)\]\(([a-f0-9-]+)\)', 'g')
  LOOP
    _mentioned_id := _mention_match[2]::uuid;

    -- Don't notify sender or the receiver (they already get a DM notification)
    IF _mentioned_id != NEW.sender_id AND _mentioned_id != NEW.receiver_id THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _mentioned_id) THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
        VALUES (
          _mentioned_id,
          'mention',
          _sender_name || ' mentioned you',
          _sender_name || ' mentioned you in a message',
          '/inbox?chat=' || NEW.sender_id,
          NEW.sender_id
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_discussion_mention
  AFTER INSERT ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_mention_discussion();

CREATE TRIGGER on_dm_mention
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_mention_dm();
