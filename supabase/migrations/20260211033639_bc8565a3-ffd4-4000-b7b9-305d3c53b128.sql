
-- Add FK from discussions.user_id to profiles.user_id
ALTER TABLE public.discussions
  ADD CONSTRAINT discussions_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
