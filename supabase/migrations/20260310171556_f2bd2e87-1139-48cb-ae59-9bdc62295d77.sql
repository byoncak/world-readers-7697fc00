
-- Fix points_on_reaction to prevent spam: once per discussion per day
CREATE OR REPLACE FUNCTION public.points_on_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  already_awarded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = NEW.user_id
      AND action_type = 'reaction'
      AND created_at::date = CURRENT_DATE
      AND description = 'Reacted on discussion ' || NEW.discussion_id
  ) INTO already_awarded;

  IF NOT already_awarded THEN
    PERFORM award_points(NEW.user_id, 2, 'reaction', 'Reacted on discussion ' || NEW.discussion_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop and recreate all triggers
DROP TRIGGER IF EXISTS trg_points_on_discussion ON public.discussions;
DROP TRIGGER IF EXISTS trg_points_on_reaction ON public.discussion_reactions;
DROP TRIGGER IF EXISTS trg_points_on_cheer ON public.cheers;
DROP TRIGGER IF EXISTS trg_points_on_rsvp ON public.meeting_rsvps;
DROP TRIGGER IF EXISTS trg_points_on_suggestion ON public.book_votes;
DROP TRIGGER IF EXISTS trg_points_on_vote_like ON public.vote_likes;
DROP TRIGGER IF EXISTS trg_points_on_suggestion_comment ON public.suggestion_comments;
DROP TRIGGER IF EXISTS trg_points_on_dm ON public.direct_messages;
DROP TRIGGER IF EXISTS trg_points_on_recommendation ON public.book_recommendations;
DROP TRIGGER IF EXISTS trg_points_on_progress ON public.reading_progress;
DROP TRIGGER IF EXISTS trg_notify_on_discussion ON public.discussions;
DROP TRIGGER IF EXISTS trg_notify_on_book_suggestion ON public.book_votes;
DROP TRIGGER IF EXISTS trg_notify_on_dm ON public.direct_messages;
DROP TRIGGER IF EXISTS trg_notify_on_cheer ON public.cheers;
DROP TRIGGER IF EXISTS trg_notify_on_book_recommendation ON public.book_recommendations;
DROP TRIGGER IF EXISTS trg_notify_on_new_member ON public.profiles;
DROP TRIGGER IF EXISTS trg_notify_on_password_reset_request ON public.password_reset_requests;
DROP TRIGGER IF EXISTS trg_notify_on_reading_milestone ON public.reading_progress;
DROP TRIGGER IF EXISTS trg_notify_rsvp_vote ON public.meeting_rsvps;
DROP TRIGGER IF EXISTS trg_notify_rsvp_poll_activated ON public.books;

CREATE TRIGGER trg_points_on_discussion AFTER INSERT ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.points_on_discussion();
CREATE TRIGGER trg_points_on_reaction AFTER INSERT ON public.discussion_reactions FOR EACH ROW EXECUTE FUNCTION public.points_on_reaction();
CREATE TRIGGER trg_points_on_cheer AFTER INSERT ON public.cheers FOR EACH ROW EXECUTE FUNCTION public.points_on_cheer();
CREATE TRIGGER trg_points_on_rsvp AFTER INSERT ON public.meeting_rsvps FOR EACH ROW EXECUTE FUNCTION public.points_on_rsvp();
CREATE TRIGGER trg_points_on_suggestion AFTER INSERT ON public.book_votes FOR EACH ROW EXECUTE FUNCTION public.points_on_suggestion();
CREATE TRIGGER trg_points_on_vote_like AFTER INSERT ON public.vote_likes FOR EACH ROW EXECUTE FUNCTION public.points_on_vote_like();
CREATE TRIGGER trg_points_on_suggestion_comment AFTER INSERT ON public.suggestion_comments FOR EACH ROW EXECUTE FUNCTION public.points_on_suggestion_comment();
CREATE TRIGGER trg_points_on_dm AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.points_on_dm();
CREATE TRIGGER trg_points_on_recommendation AFTER INSERT ON public.book_recommendations FOR EACH ROW EXECUTE FUNCTION public.points_on_recommendation();
CREATE TRIGGER trg_points_on_progress AFTER INSERT OR UPDATE ON public.reading_progress FOR EACH ROW EXECUTE FUNCTION public.points_on_progress();
CREATE TRIGGER trg_notify_on_discussion AFTER INSERT ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.notify_on_discussion();
CREATE TRIGGER trg_notify_on_book_suggestion AFTER INSERT ON public.book_votes FOR EACH ROW EXECUTE FUNCTION public.notify_on_book_suggestion();
CREATE TRIGGER trg_notify_on_dm AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm();
CREATE TRIGGER trg_notify_on_cheer AFTER INSERT ON public.cheers FOR EACH ROW EXECUTE FUNCTION public.notify_on_cheer();
CREATE TRIGGER trg_notify_on_book_recommendation AFTER INSERT ON public.book_recommendations FOR EACH ROW EXECUTE FUNCTION public.notify_on_book_recommendation();
CREATE TRIGGER trg_notify_on_new_member AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_member();
CREATE TRIGGER trg_notify_on_password_reset_request AFTER INSERT ON public.password_reset_requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_password_reset_request();
CREATE TRIGGER trg_notify_on_reading_milestone AFTER INSERT OR UPDATE ON public.reading_progress FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_milestone();
CREATE TRIGGER trg_notify_rsvp_vote AFTER INSERT ON public.meeting_rsvps FOR EACH ROW EXECUTE FUNCTION public.notify_rsvp_vote();
CREATE TRIGGER trg_notify_rsvp_poll_activated AFTER UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.notify_rsvp_poll_activated();
