
-- Polls table
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  multiple_choice boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view polls" ON public.polls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Privileged can insert polls" ON public.polls
  FOR INSERT TO authenticated WITH CHECK (is_privileged(auth.uid()));

CREATE POLICY "Privileged can update polls" ON public.polls
  FOR UPDATE TO authenticated USING (is_privileged(auth.uid()));

CREATE POLICY "Privileged can delete polls" ON public.polls
  FOR DELETE TO authenticated USING (is_privileged(auth.uid()));

-- Poll votes table
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id, option_index)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view poll votes" ON public.poll_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own votes" ON public.poll_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.poll_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
