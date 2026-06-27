
-- Update the vote notification trigger to remove emojis
CREATE OR REPLACE FUNCTION public.notify_rsvp_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  voter_name TEXT;
  book_title TEXT;
  response_label TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO voter_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  SELECT title INTO book_title
  FROM public.books WHERE id = NEW.book_id;

  CASE NEW.response
    WHEN 'going' THEN response_label := 'is going';
    WHEN 'maybe' THEN response_label := 'might join';
    WHEN 'not_going' THEN response_label := 'can''t make it';
    ELSE response_label := 'responded';
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT 
    p.user_id,
    'rsvp_vote',
    'Meetup RSVP',
    COALESCE(voter_name, 'A reader') || ' ' || response_label || ' for the "' || COALESCE(book_title, 'book') || '" meetup!',
    '/'
  FROM public.profiles p
  WHERE p.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

-- Clean up emojis from existing rsvp notifications
UPDATE public.notifications 
SET title = regexp_replace(title, '📊 |🗳️ |📅 ', '', 'g')
WHERE type IN ('rsvp_poll', 'rsvp_vote');
