-- Saved custom reports + admin permission management

CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'tickets',
  selected_fields JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '{}',
  chart_type TEXT NOT NULL DEFAULT 'bar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage saved reports" ON saved_reports;
CREATE POLICY "Users manage saved reports" ON saved_reports FOR ALL TO authenticated
  USING (user_id = auth.uid() OR get_user_role() IN ('administrator', 'hr_manager'))
  WITH CHECK (user_id = auth.uid() OR get_user_role() IN ('administrator', 'hr_manager'));

DROP POLICY IF EXISTS "Admins manage role permissions" ON role_permissions;
CREATE POLICY "Admins manage role permissions" ON role_permissions FOR ALL TO authenticated
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');
