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

## Photo uploads (optional)

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env` to enable
photo uploads on listings. Without them, uploads return a clear "not configured" error and
everything else still works.
