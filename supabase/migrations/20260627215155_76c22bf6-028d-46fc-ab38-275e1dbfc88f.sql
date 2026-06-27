
-- ============ ENUMS ============
CREATE TYPE public.club_visibility AS ENUM ('public', 'private');
CREATE TYPE public.club_join_policy AS ENUM ('instant', 'approval');
CREATE TYPE public.club_member_role AS ENUM ('owner', 'admin', 'member');

-- ============ CLUBS ============
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image_url text,
  accent_color text,
  visibility public.club_visibility NOT NULL DEFAULT 'public',
  member_cap integer,
  join_policy public.club_join_policy NOT NULL DEFAULT 'instant',
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clubs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- ============ CLUB MEMBERS ============
CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.club_member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
CREATE INDEX club_members_user_id_idx ON public.club_members(user_id);
CREATE INDEX club_members_club_id_idx ON public.club_members(club_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- ============ JOIN REQUESTS ============
CREATE TABLE public.club_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_join_requests TO authenticated;
GRANT ALL ON public.club_join_requests TO service_role;
ALTER TABLE public.club_join_requests ENABLE ROW LEVEL SECURITY;

-- ============ INVITES ============
CREATE TABLE public.club_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_invites TO authenticated;
GRANT ALL ON public.club_invites TO service_role;
ALTER TABLE public.club_invites ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE user_id = _user_id AND club_id = _club_id)
$$;

CREATE OR REPLACE FUNCTION public.has_club_role(_user_id uuid, _club_id uuid, _role public.club_member_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE user_id = _user_id AND club_id = _club_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_club_admin(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE user_id = _user_id AND club_id = _club_id AND role IN ('owner','admin'))
$$;

-- ============ RLS POLICIES ============
CREATE POLICY "View public clubs or own clubs" ON public.clubs
  FOR SELECT USING (visibility = 'public' OR public.is_club_member(auth.uid(), id));
CREATE POLICY "Auth can create clubs" ON public.clubs
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Club admins update club" ON public.clubs
  FOR UPDATE USING (public.is_club_admin(auth.uid(), id)) WITH CHECK (public.is_club_admin(auth.uid(), id));
CREATE POLICY "Club owners delete club" ON public.clubs
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Members view memberships" ON public.club_members
  FOR SELECT USING (public.is_club_member(auth.uid(), club_id) OR user_id = auth.uid());
CREATE POLICY "Users join clubs as self" ON public.club_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update memberships" ON public.club_members
  FOR UPDATE USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins or self remove membership" ON public.club_members
  FOR DELETE USING (public.is_club_admin(auth.uid(), club_id) OR user_id = auth.uid());

CREATE POLICY "View own requests or as admin" ON public.club_join_requests
  FOR SELECT USING (user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Users request to join" ON public.club_join_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update requests" ON public.club_join_requests
  FOR UPDATE USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins or requester delete request" ON public.club_join_requests
  FOR DELETE USING (public.is_club_admin(auth.uid(), club_id) OR user_id = auth.uid());

CREATE POLICY "Admins view invites" ON public.club_invites
  FOR SELECT USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins create invites" ON public.club_invites
  FOR INSERT TO authenticated WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins update invites" ON public.club_invites
  FOR UPDATE USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins delete invites" ON public.club_invites
  FOR DELETE USING (public.is_club_admin(auth.uid(), club_id));

-- ============ GLOBAL AGGREGATE FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.get_community_totals()
RETURNS TABLE(total_pages_read bigint, total_books_finished bigint, total_members bigint, total_clubs bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT SUM(current_page) FROM public.reading_progress), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.reading_progress rp
              JOIN public.books b ON b.id = rp.book_id
              WHERE b.total_pages IS NOT NULL AND rp.current_page >= b.total_pages), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.profiles), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.clubs), 0)::bigint
$$;

CREATE OR REPLACE FUNCTION public.get_popular_books(_limit integer DEFAULT 10)
RETURNS TABLE(title text, author text, rating_count bigint, avg_rating numeric, recommendation_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH rated AS (
    SELECT b.title, b.author, COUNT(br.id) AS rc, AVG(br.rating) AS ar
    FROM public.books b
    LEFT JOIN public.book_ratings br ON br.book_id = b.id
    GROUP BY b.title, b.author
  ),
  recs AS (
    SELECT title, author, COUNT(*) AS rec_count
    FROM public.book_recommendations
    GROUP BY title, author
  )
  SELECT
    COALESCE(rated.title, recs.title) AS title,
    COALESCE(rated.author, recs.author) AS author,
    COALESCE(rated.rc, 0) AS rating_count,
    rated.ar AS avg_rating,
    COALESCE(recs.rec_count, 0) AS recommendation_count
  FROM rated FULL OUTER JOIN recs
    ON rated.title = recs.title AND rated.author = recs.author
  ORDER BY (COALESCE(rated.rc,0) + COALESCE(recs.rec_count,0)) DESC
  LIMIT _limit
$$;

-- ============ CREATE DETRITIVORES CLUB & ENROLL EXISTING MEMBERS ============
DO $$
DECLARE
  _owner uuid;
  _club_id uuid;
  _tables text[] := ARRAY[
    'books','discussions','discussion_reactions','meeting_rsvps','polls','poll_votes',
    'book_votes','book_quotes','book_ratings','book_recommendations','suggestion_comments',
    'vote_likes','cheers','direct_messages','messages','announcements','announcement_reads',
    'activity_reactions','point_transactions','user_points','user_inventory','user_achievements',
    'user_streaks','reading_progress','notifications','password_reset_requests','shop_items',
    'app_settings','personal_notes'
  ];
  t text;
BEGIN
  -- Pick owner: first existing admin, else first profile
  SELECT ur.user_id INTO _owner
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at
  LIMIT 1;

  IF _owner IS NULL THEN
    SELECT user_id INTO _owner FROM public.profiles ORDER BY created_at LIMIT 1;
  END IF;

  IF _owner IS NOT NULL THEN
    INSERT INTO public.clubs (name, description, visibility, join_policy, owner_id)
    VALUES ('Detritivores', 'The original book club 🪱', 'public', 'instant', _owner)
    RETURNING id INTO _club_id;

    -- Enroll all existing profiles
    INSERT INTO public.club_members (club_id, user_id, role)
    SELECT _club_id, p.user_id,
      CASE
        WHEN p.user_id = _owner THEN 'owner'::public.club_member_role
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('admin','moderator'))
          THEN 'admin'::public.club_member_role
        ELSE 'member'::public.club_member_role
      END
    FROM public.profiles p
    ON CONFLICT (club_id, user_id) DO NOTHING;

    -- Add club_id to every club-scoped table, backfill, default, NOT NULL
    FOREACH t IN ARRAY _tables LOOP
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE', t);
      EXECUTE format('UPDATE public.%I SET club_id = %L WHERE club_id IS NULL', t, _club_id);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN club_id SET DEFAULT %L', t, _club_id);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN club_id SET NOT NULL', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(club_id)', t || '_club_id_idx', t);
    END LOOP;
  ELSE
    -- No users yet: just add nullable club_id columns so the schema is ready
    FOREACH t IN ARRAY _tables LOOP
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(club_id)', t || '_club_id_idx', t);
    END LOOP;
  END IF;
END $$;

-- updated_at trigger for clubs
CREATE OR REPLACE FUNCTION public.update_clubs_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_clubs_updated_at();
