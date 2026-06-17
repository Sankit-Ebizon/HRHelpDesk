-- Fix: "Database error creating new user" when adding users in Supabase Auth
-- Run this in SQL Editor, then try creating the user again.

-- 1. Recreate trigger function (safe role cast + search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'hr_agent';
  v_name TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('administrator', 'hr_manager', 'hr_agent') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_name, v_role);

  RETURN NEW;
END;
$$;

-- 2. Grants required for Supabase Auth to write profiles
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT USAGE ON TYPE public.user_role TO supabase_auth_admin;
GRANT USAGE ON TYPE public.user_status TO supabase_auth_admin;

-- 3. RLS policy so profile row can be inserted on signup
DROP POLICY IF EXISTS "Enable profile insert on signup" ON profiles;
CREATE POLICY "Enable profile insert on signup"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- 4. Re-attach trigger (in case it was dropped)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
