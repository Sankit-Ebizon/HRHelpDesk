# HR Helpdesk — Simple User Guide

This guide explains how the HR Helpdesk works in everyday language.  
No technical knowledge is needed.

---

## What is HR Helpdesk?

HR Helpdesk is a website where employees can ask HR for help (salary slips, leave, benefits, etc.) and the HR team can track, reply to, and close those requests — like a support desk, but for HR.

**Live website example:** `https://hr-help-desk.vercel.app`

---

## Who Uses This App?

| Role | Who is this? | What can they do? |
|------|--------------|-------------------|
| **Employee** | Any staff member | Raise a ticket (by email or through HR) and track status |
| **HR Agent** | HR team member | View tickets, reply, assign work, log time |
| **HR Manager** | HR team lead | Same as agent + more reports and settings |
| **Administrator** | System owner / IT admin | Everything + invite users, manage permissions |

---

## Big Picture — How It Works

```
Employee has a question
        ↓
   Ticket is created
        ↓
   HR team sees it
        ↓
   HR replies & works on it
        ↓
   Ticket is closed when done
        ↓
   Employee can check status anytime
```

A **ticket** is one request or issue — like "Need salary slip" or "PF query".  
Each ticket gets a number like **HR-1003** so everyone can refer to it easily.

---

## Part 1 — Employee Workflow (No Login Needed to Track)

### How an employee raises a ticket

**Option A — Send an email**

1. Employee sends an email to the HR support address (e.g. `hrsupport@ebizondigital.com`)
2. The system automatically creates a ticket
3. Employee gets a reply email with the ticket number (e.g. `HR-1003`)

**Option B — HR creates it for them**

1. HR agent logs in and clicks **New Ticket**
2. Fills in employee name, email, subject, and description
3. Ticket is created and assigned if needed

---

### How an employee checks ticket status

1. Open the website → go to **Track Ticket** (or visit `/track`)
2. Enter:
   - Ticket number (e.g. `HR-1003`)
   - Email address used when raising the ticket
3. Click **Track**
4. See current status: Open, In Progress, On Hold, or Closed

**No password needed** for tracking — only ticket number + email.

---

## Part 2 — HR Agent / HR Manager Workflow

### Step 1 — Log in

1. Open the HR Helpdesk website
2. Enter email and password
3. Click **Sign In**
4. You land on the **Dashboard**

---

### Step 2 — See your tickets

Go to **Tickets** in the left menu.

Use the **Views** panel on the left to switch between:

| View | What you see |
|------|--------------|
| **My Open Tickets** | Tickets assigned to you |
| **Unassigned Tickets** | New tickets waiting for someone |
| **All Open Tickets** | Every open ticket |
| **Overdue Tickets** | Tickets past their due date |
| **Closed Tickets** | Finished tickets |

Click any view to filter the list.

---

### Step 3 — Open and work on a ticket

1. Click a ticket number (e.g. `HR-1003`)
2. You see several tabs:

| Tab | What it is for |
|-----|----------------|
| **Conversation** | Reply to the employee or add internal notes |
| **Details** | Change status, priority, owner, due date |
| **Attachments** | Upload or download files |
| **Time Logs** | Record how much time you spent |
| **History** | See what changed and when |

---

### Step 4 — Reply to an employee

1. Open the ticket → **Conversation** tab
2. Type your reply
3. Click **Send Reply**

→ The employee receives an email with your reply.

**Internal note:** Use "Add Internal Note" for messages only HR can see (not sent to employee).

---

### Step 5 — Update ticket status

On the **Details** tab, change status as you work:

| Status | Meaning |
|--------|---------|
| **Open** | New or just received |
| **In Progress** | Someone is working on it |
| **On Hold** | Waiting for more info |
| **Closed** | Done — issue resolved |
| **Reopened** | Closed before, but issue came back |

When finished → set status to **Closed**.

---

### Step 6 — Assign a ticket

If a ticket has no owner:

1. Open the ticket → **Details** tab
2. Select an **Owner** (HR team member)
3. Save

The assigned person gets a notification.

---

## Part 3 — Administrator Workflow

### Invite a new HR user

1. Log in as **Administrator**
2. Go to **Users**
3. Click **Invite User**
4. Fill in:
   - Full name
   - Email
   - Role (HR Agent, HR Manager, or Administrator)
5. Click **Send Invite**

The new user receives an email:

- **Accept** → set password → log in
- **Reject** → invitation is cancelled

---

### Manage settings

Go to **Settings** to manage:

| Section | Purpose |
|---------|---------|
| **Departments** | HR, Payroll, Benefits, etc. |
| **Categories** | Type of request (Salary, Leave, PF, etc.) |
| **Sub-categories** | More specific types under each category |
| **Role Permissions** | What each role can see and do |
| **Notifications** | Email alerts on/off per event |
| **General** | Support email address shown to employees |

---

## Part 4 — Reports (HR Manager / Admin)

Go to **Reports** to see:

- How many tickets are open, closed, or overdue
- Average time to close a ticket
- Tickets by category
- Time logged by each HR member
- Download reports as Excel

Useful for monthly HR reviews and team planning.

---

## Complete Ticket Journey (Example)

**Scenario:** Rahul needs his salary slip.

```
Day 1 — Morning
  Rahul emails hrsupport@ebizondigital.com
  Subject: "Need salary slip for March"
        ↓
  System creates ticket HR-1003
  Rahul gets email: "Your ticket HR-1003 has been created"
        ↓
  Ticket appears in "Unassigned Tickets" for HR team

Day 1 — Afternoon
  HR Agent Priya opens HR-1003
  Assigns it to herself
  Status → In Progress
  Replies: "We will send it by tomorrow"
        ↓
  Rahul gets email with Priya's reply

Day 2 — Morning
  Priya uploads salary slip in Attachments
  Replies: "Please find attached"
  Status → Closed
        ↓
  Rahul can track HR-1003 on /track and see "Closed"
```

---

## Notifications — What Alerts You Get

HR team members receive alerts when:

| Event | Who gets notified |
|-------|-------------------|
| New ticket created | HR team |
| Ticket assigned to you | You |
| Someone replies on your ticket | Ticket owner |
| Status changed | Relevant people |
| Ticket closed | Relevant people |
| Ticket due soon | Ticket owner |

Manage your email alerts in **Settings → Notifications**.

---

## Ticket Priority Levels

| Priority | When to use |
|----------|-------------|
| **Low** | General questions, no urgency |
| **Medium** | Normal requests (default) |
| **High** | Needs attention within 1–2 days |
| **Urgent** | Critical — same day response needed |

---

## Quick Reference — Common Tasks

| I want to… | Where to go |
|------------|-------------|
| See my assigned tickets | Tickets → My Open Tickets |
| Pick up a new ticket | Tickets → Unassigned Tickets |
| Reply to an employee | Open ticket → Conversation → Send Reply |
| Close a ticket | Open ticket → Details → Status → Closed |
| Create a ticket for someone | Tickets → New Ticket |
| Track my ticket (employee) | Track Ticket page — enter number + email |
| Invite a new HR user | Users → Invite User (Admin only) |
| See monthly stats | Reports |
| Change support email | Settings → General (Admin only) |

---

## Password & Account Help

| Problem | Solution |
|---------|----------|
| Forgot password | Click **Forgot password** on login page |
| First time after invite | Accept invite email → use **Forgot password** to set password → log in |
| Cannot log in | Contact your Administrator |

---

## Glossary — Simple Terms

| Term | Meaning |
|------|---------|
| **Ticket** | One HR request or issue |
| **Ticket Number** | Unique ID like HR-1003 |
| **Contact** | Employee who raised the ticket |
| **Owner** | HR person responsible for the ticket |
| **Status** | Where the ticket is in the process (Open, Closed, etc.) |
| **Priority** | How urgent the ticket is |
| **Internal Note** | HR-only comment, not visible to employee |
| **Due Date** | Target date to resolve the ticket |
| **Time Log** | Hours spent working on a ticket |

---

## Need Help?

- **Employees:** Contact your HR support email or use the Track Ticket page
- **HR team:** Ask your Administrator
- **Administrators:** Check technical setup in `docs/APPLICATION_FLOW.md`

---

*HR Helpdesk — Ebizon Digital*
