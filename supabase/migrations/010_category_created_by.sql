-- Track who created each ticket category
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

UPDATE categories c
SET created_by = (
  SELECT id FROM profiles
  WHERE role = 'administrator' AND status = 'active'
  ORDER BY created_at
  LIMIT 1
)
WHERE c.created_by IS NULL;
