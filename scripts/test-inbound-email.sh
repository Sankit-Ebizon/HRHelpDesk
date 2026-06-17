#!/usr/bin/env bash
# Simulate an employee emailing the HR helpdesk inbox.
# Usage: ./scripts/test-inbound-email.sh
# Requires: npm run dev running, .env.local with INBOUND_EMAIL_WEBHOOK_SECRET

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env.local" ]; then
  # shellcheck disable=SC1091
  set -a && source "$PROJECT_DIR/.env.local" && set +a
fi

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
SECRET="${INBOUND_EMAIL_WEBHOOK_SECRET:-your_webhook_secret}"
HELPDESK_EMAIL="${HR_HELPDESK_EMAIL:-sankit@yopmail.com}"
FROM_EMAIL="${1:-employee@yopmail.com}"
SUBJECT="${2:-Salary slip request for June}"

echo "Creating ticket via inbound email webhook..."
echo "  To:   $HELPDESK_EMAIL"
echo "  From: $FROM_EMAIL"
echo "  URL:  $APP_URL/api/webhooks/inbound-email"
echo ""

curl -s -X POST "$APP_URL/api/webhooks/inbound-email" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d "{
    \"from\": \"$FROM_EMAIL\",
    \"from_name\": \"Test Employee\",
    \"to\": \"$HELPDESK_EMAIL\",
    \"subject\": \"$SUBJECT\",
    \"text\": \"Hi HR team, I need my salary slip for June 2026. Please help.\"
  }" | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "Check dashboard → Tickets (refresh the page)."
