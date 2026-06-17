-- App roles registry (supports labels + soft delete)
CREATE TABLE IF NOT EXISTS app_roles (
  role user_role PRIMARY KEY,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_roles (role, label, is_system, is_active)
VALUES
  ('administrator', 'Administrator', true, true),
  ('hr_manager', 'HR Manager', true, true),
  ('hr_agent', 'HR Agent', true, true)
ON CONFLICT (role) DO UPDATE SET
  label = EXCLUDED.label,
  is_system = EXCLUDED.is_system,
  is_active = true;

-- Key/value settings store
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES ('support_email', COALESCE(NULLIF(current_setting('app.support_email', true), ''), 'hrsupport@ebizondigital.com'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION update_updated_at_app_roles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_roles_updated_at ON app_roles;
CREATE TRIGGER trg_app_roles_updated_at
  BEFORE UPDATE ON app_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_app_roles();

CREATE OR REPLACE FUNCTION create_user_role(
  role_key TEXT,
  role_label TEXT,
  clone_from TEXT DEFAULT 'hr_agent'
)
RETURNS VOID AS $$
DECLARE
  normalized_role TEXT;
BEGIN
  IF get_user_role() <> 'administrator' THEN
    RAISE EXCEPTION 'Only administrators can create roles';
  END IF;

  normalized_role := lower(trim(role_key));
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

  EXECUTE format(
    'INSERT INTO role_permissions(role, module_id, can_read, can_create, can_edit, can_delete)
     SELECT %L::user_role, module_id, can_read, can_create, can_edit, can_delete
     FROM role_permissions
     WHERE role = %L::user_role
     ON CONFLICT(role, module_id) DO NOTHING',
    normalized_role,
    lower(trim(clone_from))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rename_user_role(
  old_role_key TEXT,
  new_role_key TEXT,
  new_role_label TEXT
)
RETURNS VOID AS $$
DECLARE
  normalized_old TEXT;
  normalized_new TEXT;
BEGIN
  IF get_user_role() <> 'administrator' THEN
    RAISE EXCEPTION 'Only administrators can rename roles';
  END IF;

  normalized_old := lower(trim(old_role_key));
  normalized_new := lower(trim(new_role_key));

  IF normalized_old IN ('administrator', 'hr_manager', 'hr_agent') THEN
    RAISE EXCEPTION 'System roles cannot be renamed';
  END IF;

  IF normalized_new !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Role key must match ^[a-z][a-z0-9_]*$';
  END IF;

  EXECUTE format('ALTER TYPE user_role RENAME VALUE %L TO %L', normalized_old, normalized_new);
  EXECUTE format(
    'UPDATE app_roles SET label = %L, is_active = true WHERE role = %L::user_role',
    new_role_label,
    normalized_new
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION deactivate_user_role(
  role_key TEXT,
  reassign_to TEXT DEFAULT 'hr_agent'
)
RETURNS VOID AS $$
DECLARE
  normalized_role TEXT;
  normalized_reassign TEXT;
BEGIN
  IF get_user_role() <> 'administrator' THEN
    RAISE EXCEPTION 'Only administrators can delete roles';
  END IF;

  normalized_role := lower(trim(role_key));
  normalized_reassign := lower(trim(reassign_to));

  IF normalized_role IN ('administrator', 'hr_manager', 'hr_agent') THEN
    RAISE EXCEPTION 'System roles cannot be deleted';
  END IF;

  EXECUTE format(
    'UPDATE profiles SET role = %L::user_role WHERE role = %L::user_role',
    normalized_reassign,
    normalized_role
  );
  EXECUTE format(
    'DELETE FROM role_permissions WHERE role = %L::user_role',
    normalized_role
  );
  EXECUTE format(
    'UPDATE app_roles SET is_active = false WHERE role = %L::user_role',
    normalized_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_user_role(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rename_user_role(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_user_role(TEXT, TEXT) TO authenticated;

ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read app roles" ON app_roles;
CREATE POLICY "Read app roles" ON app_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage app roles" ON app_roles;
CREATE POLICY "Admins manage app roles" ON app_roles FOR ALL TO authenticated
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Read app settings" ON app_settings;
CREATE POLICY "Read app settings" ON app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage app settings" ON app_settings;
CREATE POLICY "Admins manage app settings" ON app_settings FOR ALL TO authenticated
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');
