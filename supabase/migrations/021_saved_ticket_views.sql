-- Saved custom ticket views (Zoho Desk-style)

CREATE TABLE IF NOT EXISTS saved_ticket_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  base_view TEXT NOT NULL DEFAULT 'all'
    CHECK (base_view IN ('my_open', 'unassigned', 'all', 'overdue', 'closed')),
  filters JSONB NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'shared', 'public')),
  is_starred BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_ticket_views_user ON saved_ticket_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_ticket_views_starred
  ON saved_ticket_views(user_id, is_starred)
  WHERE is_starred = true;

ALTER TABLE saved_ticket_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read visible saved ticket views" ON saved_ticket_views;
CREATE POLICY "Users read visible saved ticket views" ON saved_ticket_views FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR visibility IN ('shared', 'public')
    OR get_user_role() IN ('administrator', 'hr_manager')
  );

DROP POLICY IF EXISTS "Users insert own saved ticket views" ON saved_ticket_views;
CREATE POLICY "Users insert own saved ticket views" ON saved_ticket_views FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update saved ticket views" ON saved_ticket_views;
CREATE POLICY "Users update saved ticket views" ON saved_ticket_views FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() IN ('administrator', 'hr_manager'))
  WITH CHECK (user_id = auth.uid() OR get_user_role() IN ('administrator', 'hr_manager'));

DROP POLICY IF EXISTS "Users delete saved ticket views" ON saved_ticket_views;
CREATE POLICY "Users delete saved ticket views" ON saved_ticket_views FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() IN ('administrator', 'hr_manager'));
