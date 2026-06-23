-- Extended department fields for help center configuration
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS help_center_display_name TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS display_in_help_center BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS associate_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('department-logos', 'department-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated upload department logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'department-logos');

CREATE POLICY "Public read department logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'department-logos');
