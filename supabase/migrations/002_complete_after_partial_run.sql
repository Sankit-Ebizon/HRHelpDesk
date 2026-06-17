-- Run this ONLY if 001_initial_schema.sql failed partway through.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT where possible.

-- Fix hr_agent permissions for reports/users/settings (if first run stopped early)
UPDATE role_permissions rp
SET can_read = true
FROM modules m
WHERE rp.module_id = m.id
  AND rp.role = 'hr_agent'
  AND m.slug IN ('reports', 'users', 'settings');

-- Fix hr_manager departments permissions
UPDATE role_permissions rp
SET can_create = true, can_edit = true
FROM modules m
WHERE rp.module_id = m.id
  AND rp.role = 'hr_manager'
  AND m.slug = 'departments';

-- Seed departments (skip if already exist)
INSERT INTO departments (name, description) VALUES
  ('Human Resources', 'HR department'),
  ('Payroll', 'Payroll and compensation'),
  ('Benefits', 'Employee benefits'),
  ('Recruitment', 'Hiring and onboarding'),
  ('General', 'General HR inquiries')
ON CONFLICT (name) DO NOTHING;

-- Seed categories (skip duplicates)
INSERT INTO categories (name, department_id)
SELECT 'Payroll & Salary', id FROM departments WHERE name = 'Payroll'
ON CONFLICT (name, department_id) DO NOTHING;

INSERT INTO categories (name, department_id)
SELECT 'Leave & Attendance', id FROM departments WHERE name = 'Human Resources'
ON CONFLICT (name, department_id) DO NOTHING;

INSERT INTO categories (name, department_id)
SELECT 'Benefits & Insurance', id FROM departments WHERE name = 'Benefits'
ON CONFLICT (name, department_id) DO NOTHING;

INSERT INTO categories (name, department_id)
SELECT 'Onboarding', id FROM departments WHERE name = 'Recruitment'
ON CONFLICT (name, department_id) DO NOTHING;

INSERT INTO categories (name, department_id)
SELECT 'General Inquiry', id FROM departments WHERE name = 'General'
ON CONFLICT (name, department_id) DO NOTHING;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_permission(p_module_slug TEXT, p_action permission_action)
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

  CASE p_action
    WHEN 'read' THEN RETURN v_perm.can_read;
    WHEN 'create' THEN RETURN v_perm.can_create;
    WHEN 'edit' THEN RETURN v_perm.can_edit;
    WHEN 'delete' THEN RETURN v_perm.can_delete;
    ELSE RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies (drop first if re-running)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "HR managers can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated read departments" ON departments;
DROP POLICY IF EXISTS "Admin manage departments" ON departments;
DROP POLICY IF EXISTS "Authenticated read categories" ON categories;
DROP POLICY IF EXISTS "Admin manage categories" ON categories;
DROP POLICY IF EXISTS "Authenticated read subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admin manage subcategories" ON subcategories;
DROP POLICY IF EXISTS "Read contacts" ON contacts;
DROP POLICY IF EXISTS "Create contacts" ON contacts;
DROP POLICY IF EXISTS "Edit contacts" ON contacts;
DROP POLICY IF EXISTS "Delete contacts" ON contacts;
DROP POLICY IF EXISTS "Read tickets" ON tickets;
DROP POLICY IF EXISTS "Create tickets" ON tickets;
DROP POLICY IF EXISTS "Edit tickets" ON tickets;
DROP POLICY IF EXISTS "Delete tickets" ON tickets;
DROP POLICY IF EXISTS "Read comments" ON ticket_comments;
DROP POLICY IF EXISTS "Create comments" ON ticket_comments;
DROP POLICY IF EXISTS "Read attachments" ON ticket_attachments;
DROP POLICY IF EXISTS "Upload attachments" ON ticket_attachments;
DROP POLICY IF EXISTS "Read time logs" ON time_logs;
DROP POLICY IF EXISTS "Create time logs" ON time_logs;
DROP POLICY IF EXISTS "Edit own time logs" ON time_logs;
DROP POLICY IF EXISTS "Delete time logs" ON time_logs;
DROP POLICY IF EXISTS "Read ticket history" ON ticket_history;
DROP POLICY IF EXISTS "Own notifications" ON notifications;
DROP POLICY IF EXISTS "Own notification prefs" ON notification_preferences;
DROP POLICY IF EXISTS "Read modules" ON modules;
DROP POLICY IF EXISTS "Read role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read attachments storage" ON storage.objects;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (get_user_role() = 'administrator');
CREATE POLICY "HR managers can view profiles" ON profiles FOR SELECT USING (get_user_role() = 'hr_manager');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (get_user_role() = 'administrator');

CREATE POLICY "Authenticated read departments" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage departments" ON departments FOR ALL USING (get_user_role() IN ('administrator', 'hr_manager'));

CREATE POLICY "Authenticated read categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage categories" ON categories FOR ALL USING (get_user_role() IN ('administrator', 'hr_manager'));

CREATE POLICY "Authenticated read subcategories" ON subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage subcategories" ON subcategories FOR ALL USING (get_user_role() IN ('administrator', 'hr_manager'));

CREATE POLICY "Read contacts" ON contacts FOR SELECT TO authenticated USING (has_permission('contacts', 'read'));
CREATE POLICY "Create contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (has_permission('contacts', 'create'));
CREATE POLICY "Edit contacts" ON contacts FOR UPDATE TO authenticated USING (has_permission('contacts', 'edit'));
CREATE POLICY "Delete contacts" ON contacts FOR DELETE TO authenticated USING (has_permission('contacts', 'delete'));

CREATE POLICY "Read tickets" ON tickets FOR SELECT TO authenticated USING (
  has_permission('tickets', 'read') AND (
    get_user_role() IN ('administrator', 'hr_manager') OR
    owner_id = auth.uid() OR
    owner_id IS NULL
  )
);
CREATE POLICY "Create tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (has_permission('tickets', 'create'));
CREATE POLICY "Edit tickets" ON tickets FOR UPDATE TO authenticated USING (
  has_permission('tickets', 'edit') AND (
    get_user_role() IN ('administrator', 'hr_manager') OR owner_id = auth.uid()
  )
);
CREATE POLICY "Delete tickets" ON tickets FOR DELETE TO authenticated USING (get_user_role() = 'administrator');

CREATE POLICY "Read comments" ON ticket_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
    get_user_role() IN ('administrator', 'hr_manager') OR t.owner_id = auth.uid() OR t.owner_id IS NULL
  ))
);
CREATE POLICY "Create comments" ON ticket_comments FOR INSERT TO authenticated WITH CHECK (has_permission('tickets', 'edit'));

CREATE POLICY "Read attachments" ON ticket_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Upload attachments" ON ticket_attachments FOR INSERT TO authenticated WITH CHECK (has_permission('tickets', 'edit'));

CREATE POLICY "Read time logs" ON time_logs FOR SELECT TO authenticated USING (
  has_permission('time_logs', 'read') AND (
    get_user_role() IN ('administrator', 'hr_manager') OR user_id = auth.uid()
  )
);
CREATE POLICY "Create time logs" ON time_logs FOR INSERT TO authenticated WITH CHECK (
  has_permission('time_logs', 'create') AND user_id = auth.uid()
);
CREATE POLICY "Edit own time logs" ON time_logs FOR UPDATE TO authenticated USING (
  (user_id = auth.uid() AND has_permission('time_logs', 'edit')) OR
  (get_user_role() IN ('administrator', 'hr_manager') AND has_permission('time_logs', 'edit'))
);
CREATE POLICY "Delete time logs" ON time_logs FOR DELETE TO authenticated USING (
  (user_id = auth.uid() AND has_permission('time_logs', 'delete')) OR
  get_user_role() IN ('administrator', 'hr_manager')
);

CREATE POLICY "Read ticket history" ON ticket_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own notifications" ON notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own notification prefs" ON notification_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Read modules" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read role permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated read attachments storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments');
