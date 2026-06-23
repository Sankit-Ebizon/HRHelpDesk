-- Track who created each department
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill seeded / legacy rows with the first active administrator
UPDATE departments d
SET created_by = (
  SELECT id FROM profiles
  WHERE role = 'administrator' AND status = 'active'
  ORDER BY created_at
  LIMIT 1
)
WHERE d.created_by IS NULL;
