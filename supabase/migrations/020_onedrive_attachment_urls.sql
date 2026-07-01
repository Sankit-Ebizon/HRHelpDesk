-- Optional OneDrive links for email attachments archived to Microsoft 365
ALTER TABLE ticket_attachments
  ADD COLUMN IF NOT EXISTS onedrive_url TEXT,
  ADD COLUMN IF NOT EXISTS onedrive_item_id TEXT;
