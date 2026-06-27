-- Track personal completion of club books (separate from club status)
CREATE TABLE public.personal_book_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.personal_book_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view personal completions"
ON public.personal_book_completions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own completions"
ON public.personal_book_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
ON public.personal_book_completions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_personal_book_completions_user ON public.personal_book_completions(user_id);