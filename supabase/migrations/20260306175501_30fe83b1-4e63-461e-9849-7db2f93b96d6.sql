
-- Allow anonymous inserts for password reset requests
DROP POLICY "Users can insert own reset requests" ON public.password_reset_requests;

CREATE POLICY "Anyone can insert reset requests"
  ON public.password_reset_requests FOR INSERT TO anon, authenticated
  WITH CHECK (true);
