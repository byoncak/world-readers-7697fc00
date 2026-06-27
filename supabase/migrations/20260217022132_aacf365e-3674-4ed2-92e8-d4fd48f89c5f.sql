CREATE POLICY "Privileged users can delete books"
ON public.books
FOR DELETE
USING (is_privileged(auth.uid()));