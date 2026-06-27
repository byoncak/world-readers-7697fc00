
CREATE TABLE public.discussion_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discussion_id, user_id, reaction_type)
);

ALTER TABLE public.discussion_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reactions"
  ON public.discussion_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reactions"
  ON public.discussion_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.discussion_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
