# HR Helpdesk Application

A Zoho Desk-inspired HR Helpdesk built with **Next.js 15**, **Supabase**, and **TypeScript**. Manage employee support tickets, time logs, contacts, and reports with role-based access control.

## Features

### MVP Modules
- **Tickets** — Create, assign, filter, and manage support tickets with Zoho-style views
- **Contacts** — Auto-created from ticket submissions and inbound emails
- **Users & Profiles** — Administrator, HR Manager, HR Agent roles with RBAC
- **Departments & Categories** — Organize tickets by department and category
- **Time Logs** — Track time spent per ticket with validation
- **Notifications** — Email + in-app notifications for ticket events
- **Reports** — Dashboard analytics (tickets, resolution time, category breakdown, agent productivity)
- **Employee Portal** — Public ticket status tracking at `/track`
- **Email-to-Ticket** — Webhook API for inbound emails to `hrsupport@ebizondigital.com`

### Ticket Views
- My Open Tickets
- Unassigned Tickets
- All Tickets
- Overdue Tickets
- Closed Tickets

### Ticket Detail Tabs
- Conversation (replies + internal comments)
- Details (editable fields)
- Attachments
- Time Logs (with total time)
- History (audit trail)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| UI | Tailwind CSS + Radix UI |
| Charts | Recharts |
| Email | Resend (configurable) |

## Getting Started

### 1. Clone and Install

```bash
cd HRHelpDesk
npm install
cp .env.example .env.local
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and keys to `.env.local`
3. Run the migration in the Supabase SQL Editor:

```bash
# Copy contents of supabase/migrations/001_initial_schema.sql
# Paste and run in Supabase Dashboard → SQL Editor
```

4. Create a storage bucket named `ticket-attachments` (or run migration which creates it)

### 3. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
HR_HELPDESK_EMAIL=hrsupport@ebizondigital.com
INBOUND_EMAIL_WEBHOOK_SECRET=your_webhook_secret
EMAIL_FROM=noreply@ebizondigital.com
RESEND_API_KEY=your_resend_api_key
```

### 4. Create First Admin User

1. Sign up via Supabase Dashboard → Authentication → Users → Add User
2. In SQL Editor, promote to administrator:

```sql
UPDATE profiles SET role = 'administrator' WHERE email = 'your@email.com';
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Email-to-Ticket Setup

Configure your email provider (SendGrid Inbound Parse, Mailgun, Postmark, etc.) to forward emails sent to `hrsupport@ebizondigital.com` to:

```
POST https://your-domain.com/api/webhooks/inbound-email
Header: x-webhook-secret: your_webhook_secret
Body: { "from": "employee@company.com", "from_name": "John Doe", "subject": "...", "text": "...", "to": "hrsupport@ebizondigital.com" }
```

Employees receive an auto-reply with their ticket number and can track status at `/track`.

## Role Permissions

| Module | Administrator | HR Manager | HR Agent |
|--------|--------------|------------|----------|
| Tickets | Full | Read/Create/Edit | Assigned only |
| Contacts | Full | Read/Create/Edit | Read |
| Users | Full | Read | — |
| Departments | Full | Read/Create/Edit | Read |
| Categories | Full | Read/Create/Edit | Read |
| Time Logs | Full | Full | Own entries |
| Reports | Full | Read | — |
| Settings | Full | Read | — |

## Due Date Reminders

Set up a daily cron job (Vercel Cron, etc.) to call:

```
GET https://your-domain.com/api/cron/due-date-reminders
```

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Authenticated routes
│   │   ├── dashboard/
│   │   ├── tickets/
│   │   ├── contacts/
│   │   ├── users/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/
│   │   ├── webhooks/    # Inbound email
│   │   ├── public/      # Employee ticket tracking
│   │   └── cron/        # Scheduled jobs
│   ├── login/
│   └── track/           # Public employee portal
├── components/
│   ├── ui/              # Reusable UI primitives
│   ├── layout/          # Sidebar, shell
│   ├── tickets/         # Ticket-specific components
│   └── reports/         # Chart components
├── lib/
│   ├── supabase/        # Client, server, admin, middleware
│   ├── actions/         # Server actions
│   ├── auth.ts          # Auth helpers & permissions
│   ├── queries.ts       # Data fetching
│   ├── notifications.ts
│   └── email.ts
└── types/
supabase/
└── migrations/          # Database schema
```

## Phase 2 (Future)

- Drag-and-drop custom report builder
- Advanced permission matrix UI
- SLA policies
- Knowledge base
- Multi-language support

## License

Private — Ebizon Digital
