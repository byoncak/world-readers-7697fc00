
-- Tighten books policies to require authenticated user
DROP POLICY "Authenticated users can insert books" ON public.books;
DROP POLICY "Authenticated users can update books" ON public.books;

CREATE POLICY "Authenticated users can insert books" ON public.books 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update books" ON public.books 
  FOR UPDATE TO authenticated 
  USING (auth.uid() IS NOT NULL);
