
CREATE OR REPLACE FUNCTION public.notify_on_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _base text;
  _name text;
  _book_title text;
  _book_id text;
BEGIN
  IF NEW.achievement_key LIKE '%:%' THEN
    _base := split_part(NEW.achievement_key, ':', 1);
    _book_id := split_part(NEW.achievement_key, ':', 2);
  ELSE
    _base := NEW.achievement_key;
  END IF;

  _name := CASE _base
    WHEN 'first_chapter' THEN 'First Chapter 📖'
    WHEN 'finisher' THEN 'Finisher 🏁'
    WHEN 'first_finisher' THEN 'Gold Medal 🥇'
    WHEN 'conversation_starter' THEN 'Conversation Starter 💬'
    WHEN 'thoughtful' THEN 'Thoughtful 💖'
    WHEN 'cheerleader' THEN 'Cheerleader 👏'
    WHEN 'on_fire' THEN 'On Fire 🔥'
    WHEN 'speedreader' THEN 'Speedreader ⚡'
    WHEN 'all_star' THEN 'All-Star ⭐'
    WHEN 'bookworm' THEN 'Bookworm 🐛'
    WHEN 'legend' THEN 'Legend 🏆'
    ELSE initcap(replace(_base, '_', ' '))
  END;

  IF _base = 'first_finisher' AND _book_id IS NOT NULL THEN
    SELECT title INTO _book_title FROM public.books WHERE id = _book_id::uuid;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, triggered_by)
  VALUES (
    NEW.user_id,
    'achievement',
    '🏆 Achievement unlocked!',
    'You earned ' || _name ||
      CASE WHEN _book_title IS NOT NULL THEN ' for "' || _book_title || '"' ELSE '' END
      || '.',
    '/profile/' || NEW.user_id,
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_achievement ON public.user_achievements;
CREATE TRIGGER trg_notify_on_achievement
AFTER INSERT ON public.user_achievements
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_achievement();
