
-- =========================================================
-- 1. SUPER USER CONFIG (singleton, self-binding on verified sign-in)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.super_user_config (
  id              int         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  target_email    text        NOT NULL,
  bound_user_id   uuid        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  bound_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.super_user_config TO authenticated;
GRANT ALL    ON public.super_user_config TO service_role;

ALTER TABLE public.super_user_config ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated may read (they'll only see target_email + whether it's bound;
-- the sensitive check is done via is_super_user which is SECURITY DEFINER).
DROP POLICY IF EXISTS "super_user_config readable" ON public.super_user_config;
CREATE POLICY "super_user_config readable"
  ON public.super_user_config FOR SELECT
  TO authenticated
  USING (true);

-- No client writes. All mutations happen through SECURITY DEFINER paths.

-- Seed the singleton row with byoncak@gmail.com as the canonical target.
INSERT INTO public.super_user_config (id, target_email)
VALUES (1, 'byoncak@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Trigger: bound_user_id becomes immutable once set; target_email is immutable.
CREATE OR REPLACE FUNCTION public.super_user_config_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.bound_user_id IS NOT NULL
       AND NEW.bound_user_id IS DISTINCT FROM OLD.bound_user_id THEN
      RAISE EXCEPTION 'super_user binding is immutable once set';
    END IF;
    IF NEW.target_email IS DISTINCT FROM OLD.target_email THEN
      RAISE EXCEPTION 'super_user target_email is immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'super_user_config row cannot be deleted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS super_user_config_guard_trg ON public.super_user_config;
CREATE TRIGGER super_user_config_guard_trg
  BEFORE UPDATE OR DELETE ON public.super_user_config
  FOR EACH ROW EXECUTE FUNCTION public.super_user_config_guard();

-- =========================================================
-- 2. is_super_user(uid) — canonical global authorization check
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_super_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_user_config
    WHERE id = 1
      AND bound_user_id IS NOT NULL
      AND bound_user_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_user(uuid) TO authenticated, anon, service_role;

-- =========================================================
-- 3. Auto-bind on verified sign-in for the target email
-- =========================================================
CREATE OR REPLACE FUNCTION public.super_user_try_bind()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target text;
  _bound  uuid;
BEGIN
  SELECT target_email, bound_user_id
    INTO _target, _bound
    FROM public.super_user_config
   WHERE id = 1;

  IF _bound IS NOT NULL THEN
    RETURN NEW;             -- already bound; no reassignment
  END IF;

  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;             -- fail closed until email is verified
  END IF;

  IF lower(NEW.email) = lower(_target) THEN
    UPDATE public.super_user_config
       SET bound_user_id = NEW.id,
           bound_at      = now(),
           updated_at    = now()
     WHERE id = 1
       AND bound_user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS super_user_bind_on_insert ON auth.users;
CREATE TRIGGER super_user_bind_on_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.super_user_try_bind();

DROP TRIGGER IF EXISTS super_user_bind_on_confirm ON auth.users;
CREATE TRIGGER super_user_bind_on_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.super_user_try_bind();

-- =========================================================
-- 4. Admin audit log (append-only; super-user readable)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  target_kind text,
  target_id   uuid,
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL    ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit log super-user read" ON public.admin_audit_log;
CREATE POLICY "audit log super-user read"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_super_user(auth.uid()));

-- No INSERT/UPDATE/DELETE policies. All writes go through the definer helper.

CREATE OR REPLACE FUNCTION public.audit_admin_action(
  _action      text,
  _target_kind text DEFAULT NULL,
  _target_id   uuid DEFAULT NULL,
  _metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (actor_id, action, target_kind, target_id, metadata)
  VALUES (auth.uid(), _action, _target_kind, _target_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_admin_action(text, text, uuid, jsonb) TO authenticated, service_role;

-- =========================================================
-- 5. Tighten policies to super-user-only for global surfaces
-- =========================================================

-- user_roles: only super user may write; anyone authenticated may read.
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

CREATE POLICY "Super user can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_user(auth.uid()));

CREATE POLICY "Super user can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_super_user(auth.uid()))
  WITH CHECK (public.is_super_user(auth.uid()));

CREATE POLICY "Super user can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_super_user(auth.uid()));

-- app_settings: only super user may write.
DROP POLICY IF EXISTS "Admins can insert app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app_settings" ON public.app_settings;

CREATE POLICY "Super user can insert app_settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_user(auth.uid()));

CREATE POLICY "Super user can update app_settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_super_user(auth.uid()))
  WITH CHECK (public.is_super_user(auth.uid()));

-- shop_items: only super user manages catalog.
DROP POLICY IF EXISTS "Admins can manage shop items" ON public.shop_items;
CREATE POLICY "Super user can manage shop items"
  ON public.shop_items FOR ALL
  TO authenticated
  USING (public.is_super_user(auth.uid()))
  WITH CHECK (public.is_super_user(auth.uid()));

-- user_inventory: super-user override; users still see their own row updates.
DROP POLICY IF EXISTS "Admins can manage all inventory" ON public.user_inventory;
CREATE POLICY "Super user can manage all inventory"
  ON public.user_inventory FOR ALL
  TO authenticated
  USING (public.is_super_user(auth.uid()))
  WITH CHECK (public.is_super_user(auth.uid()));

-- =========================================================
-- 6. Update privileged RPCs / triggers to super-user gate
-- =========================================================

-- admin grant/relock: super-user only
CREATE OR REPLACE FUNCTION public.admin_grant_shop_item(_target_user uuid, _item_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_user(auth.uid()) THEN RETURN false; END IF;
  IF _target_user IS NULL OR _item_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.user_inventory (user_id, item_id, club_id)
  VALUES (_target_user, _item_id, _club_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  PERFORM public.audit_admin_action(
    'grant_shop_item', 'user_inventory', _target_user,
    jsonb_build_object('item_id', _item_id, 'club_id', _club_id)
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_relock_shop_item(_target_user uuid, _item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_user(auth.uid()) THEN RETURN false; END IF;
  DELETE FROM public.user_inventory WHERE user_id = _target_user AND item_id = _item_id;

  PERFORM public.audit_admin_action(
    'relock_shop_item', 'user_inventory', _target_user,
    jsonb_build_object('item_id', _item_id)
  );
  RETURN true;
END;
$$;

-- purchase_shop_item: "buy for another user" now requires super-user (was is_privileged).
CREATE OR REPLACE FUNCTION public.purchase_shop_item(_user_id uuid, _item_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _price integer;
  _balance integer;
  _already_owned boolean;
  _caller uuid;
BEGIN
  _caller := auth.uid();
  IF _caller IS NULL THEN RETURN false; END IF;
  IF _club_id IS NULL THEN RETURN false; END IF;

  IF _user_id IS NOT NULL AND _user_id <> _caller AND NOT public.is_super_user(_caller) THEN
    RETURN false;
  END IF;
  _user_id := _caller;

  SELECT price INTO _price FROM public.shop_items WHERE id = _item_id AND active = true;
  IF _price IS NULL THEN RETURN false; END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = _user_id AND item_id = _item_id) INTO _already_owned;
  IF _already_owned THEN RETURN false; END IF;

  SELECT total_points INTO _balance FROM public.user_points
   WHERE user_id = _user_id AND club_id = _club_id;
  IF _balance IS NULL OR _balance < _price THEN RETURN false; END IF;

  PERFORM public.award_points(_user_id, -_price, 'purchase', 'Purchased shop item', _club_id);
  INSERT INTO public.user_inventory (user_id, item_id, club_id) VALUES (_user_id, _item_id, _club_id);
  RETURN true;
END;
$$;

-- inventory ownership guard: super-user bypass instead of is_privileged.
CREATE OR REPLACE FUNCTION public.user_inventory_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_user(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id      IS DISTINCT FROM OLD.user_id
  OR NEW.item_id      IS DISTINCT FROM OLD.item_id
  OR NEW.club_id      IS DISTINCT FROM OLD.club_id
  OR NEW.purchased_at IS DISTINCT FROM OLD.purchased_at THEN
    RAISE EXCEPTION 'inventory ownership fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 7. Auditable RPCs the client uses for privileged actions
-- =========================================================

-- Set maintenance mode via RPC (no direct table upsert from clients).
CREATE OR REPLACE FUNCTION public.set_maintenance_mode(_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_user(auth.uid()) THEN
    RETURN false;
  END IF;

  INSERT INTO public.app_settings (key, value, updated_at)
  VALUES ('maintenance_mode', jsonb_build_object('enabled', _enabled), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public.audit_admin_action(
    'set_maintenance_mode', 'app_settings', NULL,
    jsonb_build_object('enabled', _enabled)
  );
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_maintenance_mode(boolean) TO authenticated;
