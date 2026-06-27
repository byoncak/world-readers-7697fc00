
-- Add FK from book_votes.user_id to profiles.user_id
ALTER TABLE public.book_votes
  ADD CONSTRAINT book_votes_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
