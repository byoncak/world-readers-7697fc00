-- Remove all duplicate triggers (keeping only the trg_* versions)

DROP TRIGGER IF EXISTS on_book_recommendation_insert ON public.book_recommendations;
DROP TRIGGER IF EXISTS trg_points_recommendation ON public.book_recommendations;

DROP TRIGGER IF EXISTS on_book_suggestion_insert ON public.book_votes;
DROP TRIGGER IF EXISTS trg_points_suggestion ON public.book_votes;

DROP TRIGGER IF EXISTS on_cheer_insert ON public.cheers;
DROP TRIGGER IF EXISTS trg_points_cheer ON public.cheers;

DROP TRIGGER IF EXISTS on_new_dm ON public.direct_messages;
DROP TRIGGER IF EXISTS trg_points_dm ON public.direct_messages;

DROP TRIGGER IF EXISTS on_discussion_insert ON public.discussions;
DROP TRIGGER IF EXISTS trg_points_discussion ON public.discussions;

DROP TRIGGER IF EXISTS trg_points_reaction ON public.discussion_reactions;

DROP TRIGGER IF EXISTS trg_points_rsvp ON public.meeting_rsvps;

DROP TRIGGER IF EXISTS on_new_member_insert ON public.profiles;

DROP TRIGGER IF EXISTS trg_points_progress ON public.reading_progress;

DROP TRIGGER IF EXISTS trg_points_vote_like ON public.vote_likes;

DROP TRIGGER IF EXISTS trg_points_suggestion_comment ON public.suggestion_comments;

DROP TRIGGER IF EXISTS on_password_reset_request ON public.password_reset_requests;