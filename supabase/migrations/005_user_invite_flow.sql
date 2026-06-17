-- Add invited/rejected user statuses for invite workflow
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'invited';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'rejected';

-- Secure tokens for decline-invite links in emails
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_user_id ON invite_tokens(user_id);

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
