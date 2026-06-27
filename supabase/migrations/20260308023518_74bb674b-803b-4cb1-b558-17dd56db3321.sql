
CREATE TABLE public.meeting_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  response text NOT NULL CHECK (response IN ('going', 'not_going', 'maybe')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);

ALTER TABLE public.meeting_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view RSVPs"
  ON public.meeting_rsvps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own RSVPs"
  ON public.meeting_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVPs"
  ON public.meeting_rsvps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSVPs"
  ON public.meeting_rsvps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
