-- Per-user starred system ticket views (My Open, All Open, etc.)

CREATE TABLE IF NOT EXISTS starred_system_ticket_views (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_id TEXT NOT NULL
    CHECK (view_id IN ('my_open', 'unassigned', 'all', 'overdue', 'closed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, view_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_system_ticket_views_user
  ON starred_system_ticket_views(user_id);

ALTER TABLE starred_system_ticket_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own starred system views" ON starred_system_ticket_views;
CREATE POLICY "Users read own starred system views" ON starred_system_ticket_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own starred system views" ON starred_system_ticket_views;
CREATE POLICY "Users insert own starred system views" ON starred_system_ticket_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own starred system views" ON starred_system_ticket_views;
CREATE POLICY "Users delete own starred system views" ON starred_system_ticket_views
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
