-- Raw email source for "Show Original"
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS raw_email_headers TEXT,
  ADD COLUMN IF NOT EXISTS raw_email_html TEXT,
  ADD COLUMN IF NOT EXISTS raw_email_text TEXT,
  ADD COLUMN IF NOT EXISTS inbound_message_id TEXT;

ALTER TABLE ticket_comments
  ADD COLUMN IF NOT EXISTS raw_email_headers TEXT,
  ADD COLUMN IF NOT EXISTS raw_email_html TEXT,
  ADD COLUMN IF NOT EXISTS raw_email_text TEXT;

-- Pinned conversation messages
CREATE TABLE IF NOT EXISTS ticket_pinned_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_key TEXT NOT NULL,
  pinned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pinned_by_name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'all_agents' CHECK (visibility IN ('all_agents', 'only_me')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, message_key)
);

CREATE INDEX IF NOT EXISTS idx_ticket_pins_ticket ON ticket_pinned_messages(ticket_id);

ALTER TABLE ticket_pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read pins" ON ticket_pinned_messages;
CREATE POLICY "Read pins" ON ticket_pinned_messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
      AND (
        get_user_role() IN ('administrator', 'hr_manager')
        OR t.owner_id = auth.uid()
        OR t.owner_id IS NULL
      )
  )
  AND (visibility = 'all_agents' OR pinned_by = auth.uid())
);

DROP POLICY IF EXISTS "Create pins" ON ticket_pinned_messages;
CREATE POLICY "Create pins" ON ticket_pinned_messages FOR INSERT TO authenticated WITH CHECK (
  has_permission('tickets', 'edit')
);

DROP POLICY IF EXISTS "Update pins" ON ticket_pinned_messages;
CREATE POLICY "Update pins" ON ticket_pinned_messages FOR UPDATE TO authenticated USING (
  pinned_by = auth.uid() OR get_user_role() IN ('administrator', 'hr_manager')
);

DROP POLICY IF EXISTS "Delete pins" ON ticket_pinned_messages;
CREATE POLICY "Delete pins" ON ticket_pinned_messages FOR DELETE TO authenticated USING (
  pinned_by = auth.uid() OR get_user_role() IN ('administrator', 'hr_manager')
);

-- Draft / internal comment updates and deletes
DROP POLICY IF EXISTS "Update own comments" ON ticket_comments;
CREATE POLICY "Update own comments" ON ticket_comments FOR UPDATE TO authenticated USING (
  has_permission('tickets', 'edit')
  AND (
    author_id = auth.uid()
    OR get_user_role() IN ('administrator', 'hr_manager')
  )
);

DROP POLICY IF EXISTS "Delete own comments" ON ticket_comments;
CREATE POLICY "Delete own comments" ON ticket_comments FOR DELETE TO authenticated USING (
  has_permission('tickets', 'edit')
  AND (
    (author_id = auth.uid() AND comment_type IN ('internal', 'draft'))
    OR get_user_role() IN ('administrator', 'hr_manager')
  )
);

DROP POLICY IF EXISTS "Delete attachments" ON ticket_attachments;
CREATE POLICY "Delete attachments" ON ticket_attachments FOR DELETE TO authenticated USING (
  has_permission('tickets', 'edit')
);
