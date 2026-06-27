
CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own request
CREATE POLICY "Users can insert own reset requests"
  ON public.password_reset_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own reset requests"
  ON public.password_reset_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Privileged users can view all requests
CREATE POLICY "Admins can view all reset requests"
  ON public.password_reset_requests FOR SELECT TO authenticated
  USING (public.is_privileged(auth.uid()));

-- Privileged users can update requests (to mark resolved)
CREATE POLICY "Admins can update reset requests"
  ON public.password_reset_requests FOR UPDATE TO authenticated
  USING (public.is_privileged(auth.uid()));

-- Privileged users can delete requests
CREATE POLICY "Admins can delete reset requests"
  ON public.password_reset_requests FOR DELETE TO authenticated
  USING (public.is_privileged(auth.uid()));
