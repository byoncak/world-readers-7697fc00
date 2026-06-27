INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true);

CREATE POLICY "Anyone can view book covers"
ON storage.objects FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "Privileged users can upload book covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'book-covers' AND is_privileged(auth.uid()));

CREATE POLICY "Privileged users can update book covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'book-covers' AND is_privileged(auth.uid()));

CREATE POLICY "Privileged users can delete book covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'book-covers' AND is_privileged(auth.uid()));