
-- Function: notify all members when attendance poll is activated
CREATE OR REPLACE FUNCTION public.notify_rsvp_poll_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when meeting_rsvp_active changes from false to true
  IF NEW.meeting_rsvp_active = true AND OLD.meeting_rsvp_active = false THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT 
      p.user_id,
      'rsvp_poll',
      '📊 Attendance Poll is Live!',
      'The meetup poll for "' || NEW.title || '" is open — let us know if you''re joining!',
      '/'
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on books table
DROP TRIGGER IF EXISTS trg_notify_rsvp_poll_activated ON public.books;
CREATE TRIGGER trg_notify_rsvp_poll_activated
  AFTER UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rsvp_poll_activated();

-- Function: notify all other members when someone RSVPs
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
  -- Only on INSERT (first vote), not updates
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO voter_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  SELECT title INTO book_title
  FROM public.books WHERE id = NEW.book_id;

  CASE NEW.response
    WHEN 'going' THEN response_label := 'is going ✨';
    WHEN 'maybe' THEN response_label := 'might join ☕';
    WHEN 'not_going' THEN response_label := 'can''t make it 🌧️';
    ELSE response_label := 'responded';
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT 
    p.user_id,
    'rsvp_vote',
    '🗳️ Meetup RSVP',
    COALESCE(voter_name, 'A reader') || ' ' || response_label || ' for the "' || COALESCE(book_title, 'book') || '" meetup!',
    '/'
  FROM public.profiles p
  WHERE p.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

-- Trigger on meeting_rsvps table
DROP TRIGGER IF EXISTS trg_notify_rsvp_vote ON public.meeting_rsvps;
CREATE TRIGGER trg_notify_rsvp_vote
  AFTER INSERT ON public.meeting_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rsvp_vote();
