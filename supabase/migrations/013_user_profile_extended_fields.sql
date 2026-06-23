-- Extended profile fields for user information page
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country_locale TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT;
