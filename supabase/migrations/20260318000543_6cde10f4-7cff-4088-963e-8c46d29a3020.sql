INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-media', 'dm-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "DM participants can view media" ON storage.objects;
CREATE POLICY "DM participants can view media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dm-media'
  AND auth.uid()::text IN ((storage.foldername(name))[1], (storage.foldername(name))[2])
);

DROP POLICY IF EXISTS "Senders can upload DM media" ON storage.objects;
CREATE POLICY "Senders can upload DM media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dm-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Senders can update DM media" ON storage.objects;
CREATE POLICY "Senders can update DM media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dm-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'dm-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Senders can delete DM media" ON storage.objects;
CREATE POLICY "Senders can delete DM media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dm-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);