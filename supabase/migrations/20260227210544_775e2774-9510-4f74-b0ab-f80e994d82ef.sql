
-- Add image_url column to discussions
ALTER TABLE public.discussions ADD COLUMN image_url text;

-- Create storage bucket for discussion images
INSERT INTO storage.buckets (id, name, public) VALUES ('discussion-images', 'discussion-images', true);

-- RLS policies for discussion-images bucket
CREATE POLICY "Authenticated users can upload discussion images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'discussion-images');

CREATE POLICY "Anyone can view discussion images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'discussion-images');

CREATE POLICY "Users can delete own discussion images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'discussion-images' AND (storage.foldername(name))[1] = auth.uid()::text);
