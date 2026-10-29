# Campus Lab Share

Resource-sharing platform for underused lab equipment and spaces in a single engineering college.
Next.js (App Router) + Prisma + PostgreSQL.

## Setup

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate dev      # creates tables and generates the client
npx prisma db seed          # demo users
npm run dev
```

`prisma/schema.prisma` is the source of truth for the data models.

## Demo accounts (fictional data)

All accounts use the password `Demo@1234`.

| Role    | Email              |
| ------- | ------------------ |
| Student | student1@demo.edu (ID verified + safety trained) |
| Student | student2@demo.edu (ID verified only) |
| Student | student3@demo.edu (unverified) |
| Owner   | owner1@demo.edu, owner2@demo.edu |
| Manager | manager1@demo.edu, manager2@demo.edu |
| Admin   | admin@demo.edu |

## Features built

1. **Accounts, roles & verification**: signup/login (bcrypt + JWT in an httpOnly cookie), roles
   (student / owner / manager / admin), profile editing, global verification flags set by
   owners/managers, per-resource eligibility grants, role assignment by admins.
2. **Resource listings**: owners (and admins) create and edit listings with category, location,
   photos (Cloudinary), access conditions (account types, departments, ID verification, safety
   training, per-equipment approval, supervision, deposit), usage rules (max duration, max
   concurrent bookings, return condition), weekly availability slots, blackout dates and a status
   (active / under maintenance / retired). Everyone signed in can browse listings and see whether
   they meet a resource's access conditions. Seeded with 7 demo resources.

3. **Search & filtering**: keyword search across name, description, location and category
   (multi-word searches narrow the results), plus filters for category, location, availability
   (a date, optionally a from/to time window that must fit an open slot, the max booking length
   and existing bookings) and "only resources I'm eligible for". Every card shows whether you
   meet that resource's access conditions. Filters live in the URL, so searches are shareable, and
   the same query works over the API: `GET /api/resources?q=&category=&location=&date=&from=&to=&eligible=1`.

4. **Booking requests & eligibility checks**: a three-step flow (details, review, submit). Step 1
   saves a draft; step 2 runs the eligibility check and shows every rule that passed or failed
   with a clear reason; submit is blocked until they all pass and is re-checked on the server.
   Rules cover resource status, account type, department, ID verification, safety training,
   per-equipment approval, opening hours (multi-day pick-up/return supported), blackout dates, max
   booking length and the per-resource active-request limit. Warnings (already booked, supervision,
   deposit) don't block. Requesters manage drafts and requests under **My bookings** (resume,
   discard, cancel). Submissions and eligibility checks are written to the audit log.

5. **Approval, rejection & waitlisting**: a **Review** dashboard for owners (their own resources),
   managers and admins (everything), with a badge for requests awaiting a decision. Each request
   shows the requester's eligibility and the competing requests for the same slot, so nobody
   approves blind. Reviewers can approve, reject (a reason is required), or waitlist a request
   when its slot is already booked. The waitlist is first come, first served; cancelling an
   approved booking (by the requester or a reviewer) promotes the next people in line, who are
   notified. Resources that need supervision or a deposit can only be decided by a manager. Every
   outcome stores the rule that produced it (for example "you are #2 in line") and is written to
   the audit log. Notifications are queued for requesters and reviewers; the in-app feed to read
   them comes with the notifications feature.

6. **Check-in / check-out & condition reporting**: from an approved booking, the requester or the
   owner records the condition at pick-up (condition rating, notes and at least one photo), then
   again at return. Check-in opens 15 minutes before the start. The booking page shows the
   "before" and "after" side by side and flags when the condition got worse, and shows how late a
   return was. Condition photos are **private**: they are stored in Postgres and only served
   through a permission-checked route, so only the booking's two parties, managers and admins can
   see them. Overdue returns (in use past the booked end) are flagged automatically and the
   requester, owner and managers are notified.
7. **Incidents, damage & disputes**: either party can report damage, a delay or a scheduling
   conflict (with optional photos) on an approved booking. Reports go to a manager/admin queue
   at **Incidents**. A manager writes the resolution and may choose a booking suspension; that is
   always a human decision, and nothing is penalised automatically. The outcome is visible to both
   parties, recorded in the audit log, and a suspension blocks new booking requests (with the
   reason shown) until it ends.
8. **Notifications**: a bell in the nav polls for new notifications and marks them read as you open
   them; the full history is at **Notifications**. It covers new requests, approvals, rejections,
   waitlisting and promotion, cancellations, check-in/out, overdue returns, start reminders
   (one hour before) and incidents.

9. **Fair usage & allocation rules**: no one hogs a resource. Each person can have at most 3 active
   bookings at once (pending, approved or in use), at most 2 bookings of the same resource in one
   week (Monday to Sunday, campus time), and after cancelling an approved booking or missing one
   (a no-show) they must wait 24 hours before re-requesting that resource. Withdrawing a request
   that was never approved, or a reviewer cancelling, costs nothing. Approved bookings whose window
   ends with no check-in are marked **No-show** automatically. Every outcome states the rule that
   produced it ("Fair-usage rule: at most 3 active bookings at once (you have 3)"; "you are #2
   in line, first come, first served"), and **My bookings** shows where you stand.
10. **Audit history**: every state change writes an audit entry: accounts, verification and role
    changes, listings, equipment approvals, eligibility checks, requests, decisions, waitlisting
    and promotion, cancellations, check-in/out, overdue and no-show flags, incidents and
    suspensions, sign-ins and failed sign-ins. Each booking page has a **History** timeline that
    the requester, the owner, managers and admins can replay; owners and admins also see a
    **Listing history**. Admins get a platform-wide **Audit** page with filters, search and paging,
    plus a CSV export (itself audited, and safe to open in a spreadsheet).
11. **Privacy, security & role-based access**: see the notes below.

12. **AI-assisted suggestions (advisory only)**: two helpers, both labelled "suggestion" and both
    leaving every decision to a person.
    - **Resource matching**: on the Resources page, describe your project in a sentence ("I need to
      print an enclosure for my IoT project") and get up to five resources worth a look, each with a
      one-line reason and whether you are eligible for it. Nothing is booked; each suggestion links to
      the normal listing and booking flow.
    - **Incident summaries**: managers and admins can request a neutral summary of an incident
      (what was reported, the pick-up and return condition, lateness, what to check before deciding).
      It never fills in the resolution, recommends a penalty, or changes anything: the manager still
      writes the outcome and clicks the button.
    - **Works with or without a model.** With `AI_FEATURES="true"` and an `ANTHROPIC_API_KEY`, Claude
      (via the official Anthropic SDK, structured JSON output, server-side fallback on) does the work.
      Without them, or if the AI service is down, refuses, times out or returns something unusable,
      the app falls back to a built-in keyword matcher and a template summary built only from the
      recorded facts, and says so ("Basic suggestion"). Nothing is sent to a third party in that mode.
    - **The model's answer is never trusted.** Suggested resource ids must exist in the catalog the
      user could actually book (anything else is dropped), text is stripped of markup, summaries are
      length-limited, and each person has an allowance of 15 AI requests per feature per 10 minutes.
      Every use is recorded in the audit log (mode and count only, never the text).

## Privacy, security & fairness notes

**Access control**
- Roles: student, owner, manager, admin. A user sees only their own bookings; an owner sees the
  requests for resources they own; managers and admins see everything. Decisions on supervised or
  deposit-backed resources are reserved for managers.
- Every API handler checks the session and role itself, and every signed-in page checks the session
  itself (a layout check alone is not enough). `npm run check:auth` verifies this automatically
  and fails if any route or page is left open.
- The role is always read from the database, never trusted from the session token, so changing a
  role or removing a user takes effect immediately.

**Authentication & sessions**
- Passwords are hashed with bcrypt. Sessions are signed JWTs in an HttpOnly, SameSite=Lax cookie
  (Secure in production). Forged, unsigned, expired and tampered tokens are rejected.
- Repeated failed sign-ins for the same email and address lock that pair out for 15 minutes;
  sign-ups are rate-limited per address. Sign-ins, failures and lockouts are audited. The limiter
  is in memory per server instance, so on serverless it slows guessing rather than guaranteeing a
  global cap.
- A deployed site refuses to start with the sample `AUTH_SECRET`.

**Web protections**
- Writes from another site are rejected (Origin check on top of SameSite cookies). API responses are
  never cached. Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- All input is validated on the server with zod; database access goes through Prisma (parameterised).

**Privacy of uploads**
- Condition and incident photos are stored in the database and only served through a
  permission-checked route: the uploader, the booking's two parties, managers and admins. Anyone
  else gets the same 404 as a photo that does not exist. Only JPEG, PNG and WebP up to 2 MB are
  accepted (no SVG).
- Demo data is fictional. The audit log never stores typed passwords.

**Fairness & explainability**
- The fair-usage limits and the first-come-first-served waitlist apply to everyone equally, and every
  allocation outcome (approved, rejected, waitlisted with position, promoted, no-show, blocked by a
  limit) shows the rule behind it. Penalties such as suspensions are always a manager's explicit
  decision, never automatic, and are visible to both parties.

**AI suggestions and your data**
- Off by default. When enabled, a resource-matching request sends the person's one-sentence need and
  the public details of resources they could book (name, category, location, description, access
  requirements). An incident summary sends the incident description, the pick-up and return condition
  notes, the resource name, the booking time and the lateness, with the people referred to only by
  role ("the borrower", "the resource owner").
- Never sent: names, emails, user or booking ids, passwords, or any photos.
- Free text is stripped of angle brackets so it cannot fake the tags that separate data from
  instructions, and the system prompts tell the model to ignore instructions found inside the data.
  The model has no tools and cannot take any action; at worst it suggests a wrong resource, which the
  eligibility and booking rules still enforce.

**Known limitations**
- No strict Content-Security-Policy yet (it needs per-request nonces for Next.js inline scripts).
- JWTs cannot be revoked before they expire (7 days); signing out clears the cookie on that browser.
- No email or SMS notifications, and no multi-factor authentication.
- Overdue, reminder and no-show events fire when someone loads a page rather than from a worker.

## Photo uploads (optional)

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env` to enable
photo uploads on listings. Without them, uploads return a clear "not configured" error and
everything else still works.

## AI settings (optional)

| Variable | Purpose |
| --- | --- |
| `AI_FEATURES="true"` | Turns on AI mode. Without it the built-in suggestions are used. |
| `ANTHROPIC_API_KEY` | Your Anthropic API key. Required for AI mode. |
| `AI_MODEL` | Model to use. Defaults to `claude-opus-5-5`. |
| `AI_TIMEOUT_MS` | How long to wait for the model before falling back (default 20000). |

If a suggestion shows "Basic suggestion" with a note that the AI service wasn't available, the cause
is logged on the server as `[ai] ... failed: <reason>` (for example `api`, `refused`, `invalid`).

## Checks

- `npm run check:auth` fails if any API route or signed-in page could be reached without a session.

## Demo setting

Check-in normally opens 15 minutes before a booking starts. For a live demo, set `DEMO_MODE="true"`
in `.env` to let an approved booking be checked in at any time before its window ends, so you don't
have to wait for a slot to begin. Leave it unset in normal use.

## Scheduled events

There is no background worker. Overdue flags and start reminders are raised lazily: whenever a
signed-in page loads (and when the notification bell polls), anything that has become due is
flagged exactly once.
