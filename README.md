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

## Photo uploads (optional)

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env` to enable
photo uploads on listings. Without them, uploads return a clear "not configured" error and
everything else still works.
