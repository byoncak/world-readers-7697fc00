
-- Add bio to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Create book_recommendations table for private suggestions between members
CREATE TABLE public.book_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  message text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.book_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can see recommendations they sent or received
CREATE POLICY "Users can view own recommendations"
ON public.book_recommendations FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can send recommendations
CREATE POLICY "Users can insert recommendations"
ON public.book_recommendations FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Recipients can mark as read
CREATE POLICY "Recipients can update recommendations"
ON public.book_recommendations FOR UPDATE
USING (auth.uid() = to_user_id);

-- Senders can delete their recommendations
CREATE POLICY "Senders can delete recommendations"
ON public.book_recommendations FOR DELETE
USING (auth.uid() = from_user_id);
