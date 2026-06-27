-- Allow admins to manage any user's inventory (grant/revoke items)
CREATE POLICY "Admins can manage all inventory"
ON public.user_inventory
FOR ALL
TO authenticated
USING (is_privileged(auth.uid()))
WITH CHECK (is_privileged(auth.uid()));