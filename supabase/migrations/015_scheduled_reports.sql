-- Scheduled report delivery

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_kind TEXT NOT NULL CHECK (report_kind IN ('fixed', 'custom')),
  fixed_report_type TEXT,
  custom_config JSONB,
  filters JSONB NOT NULL DEFAULT '{}',
  date_range_mode TEXT NOT NULL DEFAULT 'rolling_30d'
    CHECK (date_range_mode IN ('rolling_30d', 'previous_week', 'none')),
  interval_type TEXT NOT NULL CHECK (interval_type IN ('daily', 'weekly', 'monthly', 'custom')),
  custom_interval_days INTEGER CHECK (
    interval_type != 'custom' OR (custom_interval_days IS NOT NULL AND custom_interval_days > 0)
  ),
  recipients TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run
  ON scheduled_reports (next_run_at)
  WHERE is_active = true;

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage scheduled reports" ON scheduled_reports;
CREATE POLICY "Admins manage scheduled reports" ON scheduled_reports FOR ALL TO authenticated
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');
