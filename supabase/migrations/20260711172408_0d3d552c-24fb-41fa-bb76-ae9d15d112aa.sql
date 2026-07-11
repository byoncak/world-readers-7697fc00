
-- 1. Replace overly broad user policy with least-privilege policies
DROP POLICY IF EXISTS "Users can manage own inventory" ON public.user_inventory;

-- Users may update ONLY their own inventory rows (equip toggling, variant selection).
CREATE POLICY "Users can update own inventory"
  ON public.user_inventory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Trigger: on UPDATE by a non-privileged caller, immutable columns cannot change.
CREATE OR REPLACE FUNCTION public.user_inventory_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged(auth.uid()) THEN
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

DROP TRIGGER IF EXISTS user_inventory_guard_update ON public.user_inventory;
CREATE TRIGGER user_inventory_guard_update
BEFORE UPDATE ON public.user_inventory
FOR EACH ROW EXECUTE FUNCTION public.user_inventory_guard_update();

-- 3. Harden purchase_shop_item: always use auth.uid(); ignore caller-supplied id.
CREATE OR REPLACE FUNCTION public.purchase_shop_item(_user_id uuid, _item_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _price integer;
  _balance integer;
  _already_owned boolean;
  _caller uuid;
BEGIN
  _caller := auth.uid();
  IF _caller IS NULL THEN RETURN false; END IF;
  IF _club_id IS NULL THEN RETURN false; END IF;
  -- The RPC always acts on the signed-in user; the parameter is retained
  -- for backward compatibility but is never trusted.
  IF _user_id IS NOT NULL AND _user_id <> _caller AND NOT public.is_privileged(_caller) THEN
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
$function$;

-- 4. Privileged free-grant + relock RPCs for admin testing tools.
CREATE OR REPLACE FUNCTION public.admin_grant_shop_item(_target_user uuid, _item_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_privileged(auth.uid()) THEN RETURN false; END IF;
  IF _target_user IS NULL OR _item_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.user_inventory (user_id, item_id, club_id)
  VALUES (_target_user, _item_id, _club_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;
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
  IF NOT public.is_privileged(auth.uid()) THEN RETURN false; END IF;
  DELETE FROM public.user_inventory WHERE user_id = _target_user AND item_id = _item_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_shop_item(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_relock_shop_item(uuid, uuid) TO authenticated;
