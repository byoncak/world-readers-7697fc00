DROP POLICY IF EXISTS "View public clubs or own clubs" ON public.clubs;

CREATE POLICY "View public clubs, owned clubs, or member clubs"
ON public.clubs
FOR SELECT
TO public
USING (
  visibility = 'public'::public.club_visibility
  OR owner_id = auth.uid()
  OR public.is_club_member(auth.uid(), id)
);