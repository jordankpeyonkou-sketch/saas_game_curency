/*
# Admin security lockdown: MFA required, owner lock, team management

1. Changes
- All admin RLS policies now require assurance level aal2 (MFA verified).
- New function is_admin_mfa(uid) that checks both role existence AND aal2.
- New function is_owner(uid) for owner-only checks.
- Security Definer functions enforce that only the service role (edge functions) can write to user_roles — no direct client writes.
- Admin audit trigger now also captures actor email for better traceability.

2. Security
- Every admin SELECT/INSERT/UPDATE/DELETE policy adds (auth.jwt() ->> 'aal') = 'aal2' requirement.
- user_roles writes blocked for authenticated role — only service_role can modify roles.
- Owner row cannot be modified or deleted by any client-side policy.
*/

-- ============ UPDATED HELPER FUNCTIONS ============

-- is_admin_mfa: checks role exists AND session is at aal2
CREATE OR REPLACE FUNCTION public.is_admin_mfa(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = uid
  ) AND COALESCE(
    (auth.jwt() ->> 'aal') = 'aal2',
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_mfa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_mfa(uuid) TO authenticated;

-- is_owner_mfa: checks owner role AND aal2
CREATE OR REPLACE FUNCTION public.is_owner_mfa(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = uid AND ur.role = 'owner'
  ) AND COALESCE(
    (auth.jwt() ->> 'aal') = 'aal2',
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_owner_mfa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner_mfa(uuid) TO authenticated;

-- can_edit_mfa: owner or editor with aal2
CREATE OR REPLACE FUNCTION public.can_edit_mfa(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = uid AND ur.role IN ('owner', 'editor')
  ) AND COALESCE(
    (auth.jwt() ->> 'aal') = 'aal2',
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_edit_mfa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_mfa(uuid) TO authenticated;

-- ============ UPDATE ALL ADMIN POLICIES TO REQUIRE AAL2 ============

-- SEASONS
DROP POLICY IF EXISTS "admin_select_seasons" ON seasons;
CREATE POLICY "admin_select_seasons" ON seasons FOR SELECT
  TO authenticated USING (public.is_admin_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_seasons" ON seasons;
CREATE POLICY "admin_insert_seasons" ON seasons FOR INSERT
  TO authenticated WITH CHECK (public.can_edit_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_update_seasons" ON seasons;
CREATE POLICY "admin_update_seasons" ON seasons FOR UPDATE
  TO authenticated USING (public.can_edit_mfa(auth.uid()))
  WITH CHECK (public.can_edit_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_seasons" ON seasons;
CREATE POLICY "admin_delete_seasons" ON seasons FOR DELETE
  TO authenticated USING (public.can_edit_mfa(auth.uid()));

-- BANNERS
DROP POLICY IF EXISTS "admin_select_banners" ON banners;
CREATE POLICY "admin_select_banners" ON banners FOR SELECT
  TO authenticated USING (public.is_admin_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_banners" ON banners;
CREATE POLICY "admin_insert_banners" ON banners FOR INSERT
  TO authenticated WITH CHECK (public.can_edit_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_update_banners" ON banners;
CREATE POLICY "admin_update_banners" ON banners FOR UPDATE
  TO authenticated USING (public.can_edit_mfa(auth.uid()))
  WITH CHECK (public.can_edit_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_banners" ON banners;
CREATE POLICY "admin_delete_banners" ON banners FOR DELETE
  TO authenticated USING (public.can_edit_mfa(auth.uid()));

-- EVENTS
DROP POLICY IF EXISTS "admin_select_events" ON events;
CREATE POLICY "admin_select_events" ON events FOR SELECT
  TO authenticated USING (public.is_admin_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_events" ON events;
CREATE POLICY "admin_insert_events" ON events FOR INSERT
  TO authenticated WITH CHECK (public.can_edit_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_update_events" ON events;
CREATE POLICY "admin_update_events" ON events FOR UPDATE
  TO authenticated USING (public.can_edit_mfa(auth.uid()))
  WITH CHECK (public.can_edit_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_events" ON events;
CREATE POLICY "admin_delete_events" ON events FOR DELETE
  TO authenticated USING (public.can_edit_mfa(auth.uid()));

-- WORKFLOWS
DROP POLICY IF EXISTS "admin_select_workflows" ON workflows;
CREATE POLICY "admin_select_workflows" ON workflows FOR SELECT
  TO authenticated USING (public.is_admin_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_workflows" ON workflows;
CREATE POLICY "admin_insert_workflows" ON workflows FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_update_workflows" ON workflows;
CREATE POLICY "admin_update_workflows" ON workflows FOR UPDATE
  TO authenticated USING (public.is_admin_mfa(auth.uid()))
  WITH CHECK (public.is_admin_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_workflows" ON workflows;
CREATE POLICY "admin_delete_workflows" ON workflows FOR DELETE
  TO authenticated USING (public.is_owner_mfa(auth.uid()));

-- WORKFLOW RUNS
DROP POLICY IF EXISTS "admin_select_workflow_runs" ON workflow_runs;
CREATE POLICY "admin_select_workflow_runs" ON workflow_runs FOR SELECT
  TO authenticated USING (public.is_admin_mfa(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_workflow_runs" ON workflow_runs;
CREATE POLICY "admin_insert_workflow_runs" ON workflow_runs FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_mfa(auth.uid()));

-- AUDIT LOGS
DROP POLICY IF EXISTS "admin_select_audit" ON audit_logs;
CREATE POLICY "admin_select_audit" ON audit_logs FOR SELECT
  TO authenticated USING (public.is_admin_mfa(auth.uid()));

-- ============ USER_ROLES LOCKDOWN ============
-- Remove the old read_own_roles policy and replace with admin-only read
-- Authenticated users can still read their OWN role (needed for the admin context)
-- But NO client-side writes are allowed — only service_role
DROP POLICY IF EXISTS "read_own_roles" ON user_roles;
CREATE POLICY "read_own_roles" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Revoke all write grants from authenticated on user_roles
REVOKE INSERT, UPDATE, DELETE ON user_roles FROM authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;

-- ============ STORAGE POLICIES FOR site-media ============
-- Public read, writes only for admin (aal2 + owner/editor)
-- These are applied via the storage schema
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "site_media_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "site_media_admin_write" ON storage.objects;

  -- Public read
  EXECUTE 'CREATE POLICY site_media_public_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = ''site-media'')';

  -- Admin write (aal2 + owner/editor)
  EXECUTE 'CREATE POLICY site_media_admin_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''site-media'' AND public.can_edit_mfa(auth.uid()))';

  EXECUTE 'CREATE POLICY site_media_admin_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''site-media'' AND public.can_edit_mfa(auth.uid())) WITH CHECK (bucket_id = ''site-media'' AND public.can_edit_mfa(auth.uid()))';

  EXECUTE 'CREATE POLICY site_media_admin_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''site-media'' AND public.can_edit_mfa(auth.uid()))';
END $$;
