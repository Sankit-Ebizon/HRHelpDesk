-- Replace interval-days scheduling with daily / weekly / monthly + time + timezone

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS run_time TIME,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS weekly_days INTEGER[] DEFAULT ARRAY[1],
  ADD COLUMN IF NOT EXISTS monthly_day INTEGER DEFAULT 1;

UPDATE scheduled_reports
SET
  frequency = CASE
    WHEN interval_days = 1 THEN 'daily'
    WHEN interval_days = 7 THEN 'weekly'
    WHEN interval_days >= 28 THEN 'monthly'
    ELSE 'daily'
  END,
  run_time = COALESCE(run_time, TIME '09:00'),
  timezone = COALESCE(timezone, 'Asia/Kolkata'),
  weekly_days = COALESCE(weekly_days, ARRAY[1]),
  monthly_day = COALESCE(monthly_day, 1)
WHERE frequency IS NULL;

ALTER TABLE scheduled_reports
  ALTER COLUMN frequency SET DEFAULT 'daily',
  ALTER COLUMN run_time SET DEFAULT TIME '09:00',
  ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';

ALTER TABLE scheduled_reports
  ALTER COLUMN frequency SET NOT NULL,
  ALTER COLUMN run_time SET NOT NULL,
  ALTER COLUMN timezone SET NOT NULL;

ALTER TABLE scheduled_reports
  DROP CONSTRAINT IF EXISTS scheduled_reports_frequency_check;
ALTER TABLE scheduled_reports
  ADD CONSTRAINT scheduled_reports_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'monthly'));

ALTER TABLE scheduled_reports
  DROP CONSTRAINT IF EXISTS scheduled_reports_monthly_day_check;
ALTER TABLE scheduled_reports
  ADD CONSTRAINT scheduled_reports_monthly_day_check
  CHECK (monthly_day >= 1 AND monthly_day <= 31);
