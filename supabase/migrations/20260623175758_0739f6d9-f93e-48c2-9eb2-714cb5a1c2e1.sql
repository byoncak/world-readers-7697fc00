CREATE TABLE public.activity_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id text NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id, reaction_type)
);
CREATE INDEX idx_activity_reactions_activity ON public.activity_reactions(activity_id);
GRANT SELECT, INSERT, DELETE ON public.activity_reactions TO authenticated;
GRANT ALL ON public.activity_reactions TO service_role;
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view activity reactions"
  ON public.activity_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own activity reactions"
  ON public.activity_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity reactions"
  ON public.activity_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);