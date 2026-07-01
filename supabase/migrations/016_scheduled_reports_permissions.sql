-- Scheduled Reports module, enable permission, interval simplification
-- Note: enable/disable uses can_enable + has_enable_permission() instead of extending
-- the permission_action enum (PostgreSQL cannot use new enum values in the same transaction).

ALTER TABLE role_permissions
  ADD COLUMN IF NOT EXISTS can_enable BOOLEAN NOT NULL DEFAULT false;

-- Simplify interval to days-only
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS interval_days INTEGER;

UPDATE scheduled_reports
SET interval_days = CASE
  WHEN interval_type = 'daily' THEN 1
  WHEN interval_type = 'weekly' THEN 7
  WHEN interval_type = 'monthly' THEN 30
  WHEN interval_type = 'custom' AND custom_interval_days IS NOT NULL THEN custom_interval_days
  ELSE 7
END
WHERE interval_days IS NULL;

ALTER TABLE scheduled_reports
  ALTER COLUMN interval_days SET NOT NULL;

ALTER TABLE scheduled_reports
  DROP CONSTRAINT IF EXISTS scheduled_reports_interval_days_check;

ALTER TABLE scheduled_reports
  ADD CONSTRAINT scheduled_reports_interval_days_check CHECK (interval_days > 0);

ALTER TABLE scheduled_reports DROP COLUMN IF EXISTS interval_type;
ALTER TABLE scheduled_reports DROP COLUMN IF EXISTS custom_interval_days;

-- New module
INSERT INTO modules (name, slug, description)
VALUES ('Scheduled Reports', 'scheduled_reports', 'Scheduled report delivery and management')
ON CONFLICT (slug) DO NOTHING;

-- Administrator: full access
INSERT INTO role_permissions (role, module_id, can_read, can_create, can_edit, can_delete, can_enable)
SELECT 'administrator', id, true, true, true, true, true
FROM modules WHERE slug = 'scheduled_reports'
ON CONFLICT (role, module_id) DO UPDATE SET
  can_read = true, can_create = true, can_edit = true, can_delete = true, can_enable = true;

-- Other roles: no access by default
INSERT INTO role_permissions (role, module_id, can_read, can_create, can_edit, can_delete, can_enable)
SELECT r.role::user_role, m.id, false, false, false, false, false
FROM (SELECT unnest(ARRAY['hr_manager', 'hr_agent']::TEXT[]) AS role) r
CROSS JOIN modules m
WHERE m.slug = 'scheduled_reports'
ON CONFLICT (role, module_id) DO NOTHING;

-- Enable/disable permission check (separate from permission_action enum)
CREATE OR REPLACE FUNCTION has_enable_permission(p_module_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_perm RECORD;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND status = 'active';
  IF v_role IS NULL THEN RETURN false; END IF;

  SELECT rp.* INTO v_perm
  FROM role_permissions rp
  JOIN modules m ON m.id = rp.module_id
  WHERE rp.role = v_role AND m.slug = p_module_slug;

  IF v_perm IS NULL THEN RETURN false; END IF;
  RETURN COALESCE(v_perm.can_enable, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS: permission-based access
DROP POLICY IF EXISTS "Admins manage scheduled reports" ON scheduled_reports;

CREATE POLICY "View scheduled reports" ON scheduled_reports
  FOR SELECT TO authenticated USING (has_permission('scheduled_reports', 'read'));

CREATE POLICY "Create scheduled reports" ON scheduled_reports
  FOR INSERT TO authenticated WITH CHECK (has_permission('scheduled_reports', 'create'));

CREATE POLICY "Edit scheduled reports" ON scheduled_reports
  FOR UPDATE TO authenticated USING (has_permission('scheduled_reports', 'edit'))
  WITH CHECK (has_permission('scheduled_reports', 'edit'));

CREATE POLICY "Delete scheduled reports" ON scheduled_reports
  FOR DELETE TO authenticated USING (has_permission('scheduled_reports', 'delete'));

CREATE POLICY "Enable disable scheduled reports" ON scheduled_reports
  FOR UPDATE TO authenticated USING (has_enable_permission('scheduled_reports'))
  WITH CHECK (has_enable_permission('scheduled_reports'));

-- Update role creation to include can_enable
CREATE OR REPLACE FUNCTION create_user_role(
  role_key TEXT,
  role_label TEXT,
  clone_from TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  normalized_role TEXT;
  normalized_clone TEXT;
BEGIN
  IF get_user_role() <> 'administrator' THEN
    RAISE EXCEPTION 'Only administrators can create roles';
  END IF;

  normalized_role := lower(trim(role_key));
  normalized_clone := NULLIF(lower(trim(COALESCE(clone_from, ''))), '');

  IF normalized_role !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Role key must match ^[a-z][a-z0-9_]*$';
  END IF;

  EXECUTE format('ALTER TYPE user_role ADD VALUE IF NOT EXISTS %L', normalized_role);

  EXECUTE format(
    'INSERT INTO app_roles(role, label, is_system, is_active) VALUES (%L::user_role, %L, false, true)
     ON CONFLICT(role) DO UPDATE SET label = EXCLUDED.label, is_active = true',
    normalized_role,
    role_label
  );

  IF normalized_clone IS NULL OR normalized_clone = 'none' THEN
    EXECUTE format(
      'INSERT INTO role_permissions(role, module_id, can_read, can_create, can_edit, can_delete, can_enable)
       SELECT %L::user_role, id, false, false, false, false, false FROM modules
       ON CONFLICT(role, module_id) DO NOTHING',
      normalized_role
    );

    INSERT INTO role_report_sections (role, section_id, can_view)
    SELECT normalized_role::user_role, section_id, false
    FROM (
      SELECT unnest(ARRAY[
        'tickets-created', 'tickets-closed', 'open-tickets', 'overdue-tickets',
        'avg-resolution-time', 'time-logged-hr', 'timesheet-agent', 'category-analysis', 'custom'
      ]::TEXT[]) AS section_id
    ) s
    ON CONFLICT (role, section_id) DO NOTHING;
  ELSE
    EXECUTE format(
      'INSERT INTO role_permissions(role, module_id, can_read, can_create, can_edit, can_delete, can_enable)
       SELECT %L::user_role, module_id, can_read, can_create, can_edit, can_delete, can_enable
       FROM role_permissions
       WHERE role = %L::user_role
       ON CONFLICT(role, module_id) DO NOTHING',
      normalized_role,
      normalized_clone
    );

    INSERT INTO role_report_sections (role, section_id, can_view)
    SELECT normalized_role::user_role, section_id, can_view
    FROM role_report_sections
    WHERE role = normalized_clone::user_role
    ON CONFLICT (role, section_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
