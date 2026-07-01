-- Profile avatar storage for user self-service profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users upload own profile avatars'
  ) THEN
    CREATE POLICY "Users upload own profile avatars"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'profile-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read profile avatars'
  ) THEN
    CREATE POLICY "Public read profile avatars"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'profile-avatars');
  END IF;
END $$;
