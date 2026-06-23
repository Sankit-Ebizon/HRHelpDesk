-- Per-role visibility for individual report sections

CREATE TABLE IF NOT EXISTS role_report_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  section_id TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, section_id)
);

ALTER TABLE role_report_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read report sections" ON role_report_sections;
CREATE POLICY "Authenticated users read report sections" ON role_report_sections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage report sections" ON role_report_sections;
CREATE POLICY "Admins manage report sections" ON role_report_sections
  FOR ALL TO authenticated
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- Seed default visibility for system roles (all sections visible)
INSERT INTO role_report_sections (role, section_id, can_view)
SELECT r.role::user_role, s.section_id, true
FROM (
  SELECT unnest(ARRAY['administrator', 'hr_manager', 'hr_agent']::TEXT[]) AS role
) r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'tickets-created',
    'tickets-closed',
    'open-tickets',
    'overdue-tickets',
    'avg-resolution-time',
    'time-logged-hr',
    'timesheet-agent',
    'category-analysis',
    'custom'
  ]::TEXT[]) AS section_id
) s
ON CONFLICT (role, section_id) DO NOTHING;

-- Clone report section permissions when creating a new role
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
      'INSERT INTO role_permissions(role, module_id, can_read, can_create, can_edit, can_delete)
       SELECT %L::user_role, id, false, false, false, false FROM modules
       ON CONFLICT(role, module_id) DO NOTHING',
      normalized_role
    );

    INSERT INTO role_report_sections (role, section_id, can_view)
    SELECT normalized_role::user_role, section_id, false
    FROM (
      SELECT unnest(ARRAY[
        'tickets-created',
        'tickets-closed',
        'open-tickets',
        'overdue-tickets',
        'avg-resolution-time',
        'time-logged-hr',
        'timesheet-agent',
        'category-analysis',
        'custom'
      ]::TEXT[]) AS section_id
    ) sections
    ON CONFLICT (role, section_id) DO NOTHING;
  ELSE
    EXECUTE format(
      'INSERT INTO role_permissions(role, module_id, can_read, can_create, can_edit, can_delete)
       SELECT %L::user_role, module_id, can_read, can_create, can_edit, can_delete
       FROM role_permissions
       WHERE role = %L::user_role
       ON CONFLICT(role, module_id) DO NOTHING',
      normalized_role,
      normalized_clone
    );

    EXECUTE format(
      'INSERT INTO role_report_sections(role, section_id, can_view)
       SELECT %L::user_role, section_id, can_view
       FROM role_report_sections
       WHERE role = %L::user_role
       ON CONFLICT(role, section_id) DO NOTHING',
      normalized_role,
      normalized_clone
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
