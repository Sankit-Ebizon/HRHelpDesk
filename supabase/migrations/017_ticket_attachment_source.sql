-- Distinguish inbound email attachments from agent-uploaded files
ALTER TABLE ticket_attachments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal'
  CHECK (source IN ('email', 'internal'));

UPDATE ticket_attachments
SET source = 'email'
WHERE uploaded_by IS NULL;

UPDATE ticket_attachments
SET source = 'internal'
WHERE uploaded_by IS NOT NULL;
