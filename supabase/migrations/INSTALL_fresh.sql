-- ============================================================
-- HR HELPDESK — ONE-STEP INSTALL
-- Copy this ENTIRE file into Supabase SQL Editor and click Run.
-- Resets any partial/failed migration, then creates everything fresh.
-- ============================================================

-- Does NOT delete auth.users
-- ============================================================

-- 1. Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Storage policies only (cannot DELETE from storage.buckets via SQL)
DROP POLICY IF EXISTS "Authenticated upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read attachments storage" ON storage.objects;

-- 3. Drop functions (CASCADE removes triggers)
DROP FUNCTION IF EXISTS has_permission(TEXT, permission_action) CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS log_ticket_changes() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_number() CASCADE;

-- 4. Drop all app tables
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ticket_history CASCADE;
DROP TABLE IF EXISTS time_logs CASCADE;
DROP TABLE IF EXISTS ticket_attachments CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 5. Drop sequence
DROP SEQUENCE IF EXISTS ticket_number_seq;

-- 6. Drop custom enum types
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS comment_type CASCADE;
DROP TYPE IF EXISTS permission_action CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Reset complete. Now run 001_initial_schema.sql
-- HR Helpdesk Database Schema
-- Run via Supabase SQL Editor or: supabase db push
--
-- FIRST TIME: run this file directly.
-- RE-RUN / PARTIAL FAILURE: run 000_reset_hr_helpdesk.sql first, then this file.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('administrator', 'hr_manager', 'hr_agent');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'on_hold', 'closed', 'reopened');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE permission_action AS ENUM ('read', 'create', 'edit', 'delete');
CREATE TYPE comment_type AS ENUM ('reply', 'internal');
CREATE TYPE notification_type AS ENUM (
  'ticket_created',
  'ticket_assigned',
  'ticket_reply',
  'status_changed',
  'ticket_closed',
  'due_date_reminder'
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, department_id)
);

CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'hr_agent',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status user_status NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Module permissions
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(role, module_id)
);

-- Contacts (employees who raise tickets)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT,
  company TEXT DEFAULT 'Ebizon Digital',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket sequence for HR-XXXX IDs
CREATE SEQUENCE ticket_number_seq START 1000;

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_details TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Ticket comments (replies + internal)
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  comment_type comment_type NOT NULL DEFAULT 'reply',
  is_from_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket attachments
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES ticket_comments(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time logs
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  time_spent_minutes INTEGER NOT NULL CHECK (time_spent_minutes > 0),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT log_date_not_future CHECK (log_date <= CURRENT_DATE)
);

-- Ticket history (audit trail)
CREATE TABLE ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, type)
);

-- Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_owner ON tickets(owner_id);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_due_date ON tickets(due_date);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_contact_email ON tickets(contact_email);
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX idx_time_logs_ticket ON time_logs(ticket_id);
CREATE INDEX idx_time_logs_user ON time_logs(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'HR-' || nextval('ticket_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subcategories_updated_at BEFORE UPDATE ON subcategories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ticket_comments_updated_at BEFORE UPDATE ON ticket_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_time_logs_updated_at BEFORE UPDATE ON time_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'hr_agent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ticket history logging
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT full_name INTO v_user_name FROM profiles WHERE id = auth.uid();

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_history (ticket_id, user_id, user_name, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), COALESCE(v_user_name, 'System'), 'status', OLD.status::TEXT, NEW.status::TEXT);
  END IF;

  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    INSERT INTO ticket_history (ticket_id, user_id, user_name, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), COALESCE(v_user_name, 'System'), 'owner_id', OLD.owner_id::TEXT, NEW.owner_id::TEXT);
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO ticket_history (ticket_id, user_id, user_name, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), COALESCE(v_user_name, 'System'), 'priority', OLD.priority::TEXT, NEW.priority::TEXT);
  END IF;

  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO ticket_history (ticket_id, user_id, user_name, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), COALESCE(v_user_name, 'System'), 'due_date', OLD.due_date::TEXT, NEW.due_date::TEXT);
  END IF;

  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    INSERT INTO ticket_history (ticket_id, user_id, user_name, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), COALESCE(v_user_name, 'System'), 'category_id', OLD.category_id::TEXT, NEW.category_id::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ticket_history
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_changes();

-- Seed modules
INSERT INTO modules (name, slug, description) VALUES
  ('Tickets', 'tickets', 'Ticket management'),
  ('Contacts', 'contacts', 'Contact management'),
  ('Users', 'users', 'User and profile management'),
  ('Departments', 'departments', 'Department management'),
  ('Categories', 'categories', 'Category management'),
  ('Time Logs', 'time_logs', 'Time log management'),
  ('Reports', 'reports', 'Reports and analytics'),
  ('Settings', 'settings', 'System settings');

-- Seed default permissions
-- Administrator: full access
INSERT INTO role_permissions (role, module_id, can_read, can_create, can_edit, can_delete)
SELECT 'administrator', id, true, true, true, true FROM modules;

-- HR Manager
INSERT INTO role_permissions (role, module_id, can_read, can_create, can_edit, can_delete)
SELECT 'hr_manager', id,
  true,
  slug IN ('tickets', 'contacts', 'time_logs', 'departments'),
  slug IN ('tickets', 'contacts', 'time_logs', 'categories', 'departments'),
  slug IN ('time_logs')
FROM modules
WHERE slug NOT IN ('users', 'settings');

INSERT INTO role_permissions (role, module_id, can_read, can_create, can_edit, can_delete)
SELECT 'hr_manager', id, true, false, false, false FROM modules WHERE slug IN ('users', 'settings');

-- HR Agent (single insert — covers all modules)
INSERT INTO role_permissions (role, module_id, can_read, can_create, can_edit, can_delete)
SELECT 'hr_agent', id,
  slug IN ('tickets', 'contacts', 'time_logs', 'departments', 'categories', 'reports', 'users', 'settings'),
  slug IN ('tickets', 'time_logs'),
  slug IN ('tickets', 'time_logs'),
  false
FROM modules;

-- Seed departments
INSERT INTO departments (name, description) VALUES
  ('Human Resources', 'HR department'),
  ('Payroll', 'Payroll and compensation'),
  ('Benefits', 'Employee benefits'),
  ('Recruitment', 'Hiring and onboarding'),
  ('General', 'General HR inquiries');

-- Seed categories
INSERT INTO categories (name, department_id) 
SELECT 'Payroll & Salary', id FROM departments WHERE name = 'Payroll';

INSERT INTO categories (name, department_id) 
SELECT 'Leave & Attendance', id FROM departments WHERE name = 'Human Resources';

INSERT INTO categories (name, department_id) 
SELECT 'Benefits & Insurance', id FROM departments WHERE name = 'Benefits';

INSERT INTO categories (name, department_id) 
SELECT 'Onboarding', id FROM departments WHERE name = 'Recruitment';

INSERT INTO categories (name, department_id) 
SELECT 'General Inquiry', id FROM departments WHERE name = 'General';

-- RLS Policies
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

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check permission
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

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (get_user_role() = 'administrator');
CREATE POLICY "HR managers can view profiles" ON profiles FOR SELECT USING (get_user_role() = 'hr_manager');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (get_user_role() = 'administrator');

-- Departments, categories (read for authenticated, write for admins/managers)
CREATE POLICY "Authenticated read departments" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage departments" ON departments FOR ALL USING (get_user_role() IN ('administrator', 'hr_manager'));

CREATE POLICY "Authenticated read categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage categories" ON categories FOR ALL USING (get_user_role() IN ('administrator', 'hr_manager'));

CREATE POLICY "Authenticated read subcategories" ON subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage subcategories" ON subcategories FOR ALL USING (get_user_role() IN ('administrator', 'hr_manager'));

-- Contacts
CREATE POLICY "Read contacts" ON contacts FOR SELECT TO authenticated USING (has_permission('contacts', 'read'));
CREATE POLICY "Create contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (has_permission('contacts', 'create'));
CREATE POLICY "Edit contacts" ON contacts FOR UPDATE TO authenticated USING (has_permission('contacts', 'edit'));
CREATE POLICY "Delete contacts" ON contacts FOR DELETE TO authenticated USING (has_permission('contacts', 'delete'));

-- Tickets
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
CREATE POLICY "Delete tickets" ON tickets FOR DELETE TO authenticated USING (
  get_user_role() = 'administrator'
);

-- Comments
CREATE POLICY "Read comments" ON ticket_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
    get_user_role() IN ('administrator', 'hr_manager') OR t.owner_id = auth.uid() OR t.owner_id IS NULL
  ))
);

CREATE POLICY "Create comments" ON ticket_comments FOR INSERT TO authenticated WITH CHECK (
  has_permission('tickets', 'edit')
);

-- Attachments
CREATE POLICY "Read attachments" ON ticket_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Upload attachments" ON ticket_attachments FOR INSERT TO authenticated WITH CHECK (has_permission('tickets', 'edit'));

-- Time logs
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

-- History
CREATE POLICY "Read ticket history" ON ticket_history FOR SELECT TO authenticated USING (true);

-- Notifications
CREATE POLICY "Own notifications" ON notifications FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Own notification prefs" ON notification_preferences FOR ALL USING (user_id = auth.uid());

-- Modules & permissions (read only)
CREATE POLICY "Read modules" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read role permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated read attachments storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments');

-- Public ticket status lookup (for employees via token - service role used in API)
-- Employee portal uses API routes with service role
