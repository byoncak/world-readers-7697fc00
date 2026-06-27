CREATE POLICY "Privileged can delete any suggestion"
ON public.book_votes FOR DELETE
TO authenticated
USING (is_privileged(auth.uid()));

CREATE POLICY "Privileged can delete any suggestion comment"
ON public.suggestion_comments FOR DELETE
TO authenticated
USING (is_privileged(auth.uid()));