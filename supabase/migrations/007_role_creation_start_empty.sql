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
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
