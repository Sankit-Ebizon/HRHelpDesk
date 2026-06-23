-- Category display image for listings and help center
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated upload category images'
  ) THEN
    CREATE POLICY "Authenticated upload category images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'category-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read category images'
  ) THEN
    CREATE POLICY "Public read category images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'category-images');
  END IF;
END $$;
