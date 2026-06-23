-- Extended sub-category fields: image and creator tracking
ALTER TABLE subcategories
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

UPDATE subcategories s
SET created_by = (
  SELECT id FROM profiles
  WHERE role = 'administrator' AND status = 'active'
  ORDER BY created_at
  LIMIT 1
)
WHERE s.created_by IS NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('subcategory-images', 'subcategory-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated upload subcategory images'
  ) THEN
    CREATE POLICY "Authenticated upload subcategory images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'subcategory-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read subcategory images'
  ) THEN
    CREATE POLICY "Public read subcategory images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'subcategory-images');
  END IF;
END $$;
