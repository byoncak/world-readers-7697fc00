
-- Personal books that users add to track their own reading
CREATE TABLE public.personal_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  total_pages INTEGER,
  current_page INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal books"
ON public.personal_books FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal books"
ON public.personal_books FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal books"
ON public.personal_books FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal books"
ON public.personal_books FOR DELETE
USING (auth.uid() = user_id);

-- Allow viewing other users' personal books on their profiles
CREATE POLICY "Authenticated users can view all personal books"
ON public.personal_books FOR SELECT
USING (true);

-- Drop the restrictive select policy since the permissive one covers it
DROP POLICY "Users can view own personal books" ON public.personal_books;
