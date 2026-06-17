-- ============================================================
-- HR Helpdesk — RESET (run this FIRST if migrations failed)
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
