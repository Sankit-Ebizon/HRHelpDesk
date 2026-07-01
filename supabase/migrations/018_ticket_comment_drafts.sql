-- Draft comments for forward/reply composers (saved on cancel)
ALTER TYPE comment_type ADD VALUE IF NOT EXISTS 'draft';

ALTER TABLE ticket_comments
  ADD COLUMN IF NOT EXISTS draft_metadata JSONB;

COMMENT ON COLUMN ticket_comments.draft_metadata IS
  'JSON: { mode, to, cc, bcc, quotedMessageId, subject } for draft comments';
