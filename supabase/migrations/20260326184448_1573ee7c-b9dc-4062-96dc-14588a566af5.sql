
-- Book quotes (tied to current book)
CREATE TABLE public.book_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  quote_text text NOT NULL,
  page_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view quotes" ON public.book_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own quotes" ON public.book_quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotes" ON public.book_quotes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Book ratings (only for completed books)
CREATE TABLE public.book_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ratings" ON public.book_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own ratings" ON public.book_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.book_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON public.book_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Personal notes (private to user)
CREATE TABLE public.personal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  page_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.personal_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.personal_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.personal_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.personal_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
