-- Prevent forgery of admin audit entries. Only the sole super user (or
-- SECURITY DEFINER RPCs that already gate on is_super_user) may write.
CREATE OR REPLACE FUNCTION public.audit_admin_action(
  _action text,
  _target_kind text DEFAULT NULL,
  _target_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_user(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: only the super user may write audit entries';
  END IF;

  INSERT INTO public.admin_audit_log (actor_id, action, target_kind, target_id, metadata)
  VALUES (auth.uid(), _action, _target_kind, _target_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_admin_action(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_admin_action(text, text, uuid, jsonb) TO service_role;
