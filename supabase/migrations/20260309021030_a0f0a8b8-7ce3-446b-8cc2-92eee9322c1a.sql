
-- Function to award points (called by triggers)
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _amount integer, _action_type text, _description text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert user_points
  INSERT INTO public.user_points (user_id, total_points, lifetime_points, updated_at)
  VALUES (_user_id, _amount, _amount, now())
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = user_points.total_points + _amount,
      lifetime_points = user_points.lifetime_points + GREATEST(_amount, 0),
      updated_at = now();

  -- Log transaction
  INSERT INTO public.point_transactions (user_id, amount, action_type, description)
  VALUES (_user_id, _amount, _action_type, _description);
END;
$$;

-- Trigger: discussion post (15 pts) or reply (10 pts)
CREATE OR REPLACE FUNCTION public.points_on_discussion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    PERFORM award_points(NEW.user_id, 15, 'discussion_post', 'Posted a discussion');
  ELSE
    PERFORM award_points(NEW.user_id, 10, 'discussion_reply', 'Replied to a discussion');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_discussion AFTER INSERT ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.points_on_discussion();

-- Trigger: cheer (10 pts)
CREATE OR REPLACE FUNCTION public.points_on_cheer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.from_user_id, 10, 'cheer', 'Cheered someone on');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_cheer AFTER INSERT ON public.cheers FOR EACH ROW EXECUTE FUNCTION public.points_on_cheer();

-- Trigger: reaction (2 pts)
CREATE OR REPLACE FUNCTION public.points_on_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 2, 'reaction', 'Reacted to a discussion');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_reaction AFTER INSERT ON public.discussion_reactions FOR EACH ROW EXECUTE FUNCTION public.points_on_reaction();

-- Trigger: RSVP (10 pts, only on insert)
CREATE OR REPLACE FUNCTION public.points_on_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 10, 'rsvp', 'RSVPed to a meetup');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_rsvp AFTER INSERT ON public.meeting_rsvps FOR EACH ROW EXECUTE FUNCTION public.points_on_rsvp();

-- Trigger: book suggestion (15 pts)
CREATE OR REPLACE FUNCTION public.points_on_suggestion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 15, 'book_suggestion', 'Suggested a book');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_suggestion AFTER INSERT ON public.book_votes FOR EACH ROW EXECUTE FUNCTION public.points_on_suggestion();

-- Trigger: vote/like (5 pts)
CREATE OR REPLACE FUNCTION public.points_on_vote_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 5, 'vote_like', 'Voted on a suggestion');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_vote_like AFTER INSERT ON public.vote_likes FOR EACH ROW EXECUTE FUNCTION public.points_on_vote_like();

-- Trigger: suggestion comment (8 pts)
CREATE OR REPLACE FUNCTION public.points_on_suggestion_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 8, 'suggestion_comment', 'Commented on a suggestion');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_suggestion_comment AFTER INSERT ON public.suggestion_comments FOR EACH ROW EXECUTE FUNCTION public.points_on_suggestion_comment();

-- Trigger: DM (3 pts)
CREATE OR REPLACE FUNCTION public.points_on_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.sender_id, 3, 'dm_sent', 'Sent a direct message');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_dm AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.points_on_dm();

-- Trigger: book recommendation (10 pts)
CREATE OR REPLACE FUNCTION public.points_on_recommendation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM award_points(NEW.from_user_id, 10, 'book_recommendation', 'Recommended a book');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_recommendation AFTER INSERT ON public.book_recommendations FOR EACH ROW EXECUTE FUNCTION public.points_on_recommendation();

-- Trigger: reading progress update (10 pts, but only once per day per book)
CREATE OR REPLACE FUNCTION public.points_on_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  already_awarded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE user_id = NEW.user_id
      AND action_type = 'progress_update'
      AND created_at::date = CURRENT_DATE
  ) INTO already_awarded;

  IF NOT already_awarded THEN
    PERFORM award_points(NEW.user_id, 10, 'progress_update', 'Updated reading progress');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_points_progress AFTER INSERT OR UPDATE ON public.reading_progress FOR EACH ROW EXECUTE FUNCTION public.points_on_progress();

-- Purchase function (atomic deduct + add to inventory)
CREATE OR REPLACE FUNCTION public.purchase_shop_item(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _price integer;
  _balance integer;
  _already_owned boolean;
BEGIN
  SELECT price INTO _price FROM public.shop_items WHERE id = _item_id AND active = true;
  IF _price IS NULL THEN RETURN false; END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = _user_id AND item_id = _item_id) INTO _already_owned;
  IF _already_owned THEN RETURN false; END IF;

  SELECT total_points INTO _balance FROM public.user_points WHERE user_id = _user_id;
  IF _balance IS NULL OR _balance < _price THEN RETURN false; END IF;

  -- Deduct points
  PERFORM award_points(_user_id, -_price, 'purchase', 'Purchased shop item');

  -- Add to inventory
  INSERT INTO public.user_inventory (user_id, item_id) VALUES (_user_id, _item_id);

  RETURN true;
END;
$$;
