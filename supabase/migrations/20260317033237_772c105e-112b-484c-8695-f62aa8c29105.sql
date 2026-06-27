
-- Create a function that admins can call to detect point spam
CREATE OR REPLACE FUNCTION public.detect_point_spam(_hours integer DEFAULT 24, _threshold integer DEFAULT 100)
RETURNS TABLE(user_id uuid, display_name text, total_earned integer, transaction_count bigint, latest_action text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    pt.user_id,
    COALESCE(p.display_name, 'Unknown') as display_name,
    SUM(pt.amount)::integer as total_earned,
    COUNT(*)::bigint as transaction_count,
    (SELECT action_type FROM public.point_transactions 
     WHERE user_id = pt.user_id 
     ORDER BY created_at DESC LIMIT 1) as latest_action
  FROM public.point_transactions pt
  JOIN public.profiles p ON p.user_id = pt.user_id
  WHERE pt.created_at > now() - make_interval(hours => _hours)
    AND pt.amount > 0
  GROUP BY pt.user_id, p.display_name
  HAVING SUM(pt.amount) >= _threshold
  ORDER BY SUM(pt.amount) DESC
$$;

-- Allow admins to read all point_transactions for the Data Station
CREATE POLICY "Admins can view all transactions"
ON public.point_transactions
FOR SELECT
TO authenticated
USING (is_privileged(auth.uid()));
