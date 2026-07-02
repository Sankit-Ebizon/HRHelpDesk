-- Expand scheduled report date range options

ALTER TABLE scheduled_reports
  DROP CONSTRAINT IF EXISTS scheduled_reports_date_range_mode_check;

ALTER TABLE scheduled_reports
  ADD CONSTRAINT scheduled_reports_date_range_mode_check
  CHECK (date_range_mode IN (
    'today',
    'yesterday',
    'this_week',
    'previous_week',
    'this_month',
    'last_month',
    'rolling_30d',
    'this_quarter',
    'last_quarter',
    'none'
  ));
