-- Log attachment uploads in ticket activity history
CREATE OR REPLACE FUNCTION log_ticket_attachment_added()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  IF NEW.uploaded_by IS NOT NULL THEN
    SELECT full_name INTO v_user_name FROM profiles WHERE id = NEW.uploaded_by;
  END IF;

  INSERT INTO ticket_history (ticket_id, user_id, user_name, field_name, old_value, new_value)
  VALUES (
    NEW.ticket_id,
    NEW.uploaded_by,
    COALESCE(v_user_name, 'System'),
    'attachment',
    NULL,
    NEW.file_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ticket_attachment_history ON ticket_attachments;
CREATE TRIGGER trg_ticket_attachment_history
  AFTER INSERT ON ticket_attachments
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_attachment_added();
