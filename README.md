# Laxora Billing — Admin Panel

Platform-owner administration app for the Laxora billing SaaS. Built with
**Next.js 14 + React + TypeScript + Tailwind**, deployable on **Vercel**. Only
users with the `isPlatformAdmin` flag can sign in.

## Features
- 🔐 Admin-only login (verifies `isPlatformAdmin` via the API)
- 📈 Overview — platform-wide counts (businesses, users, invoices, parties) and total sales volume
- 🏢 Businesses — list all tenants with owner + activity counts, search, delete
- 👤 Users — list all users, search, see platform-admin badges & business counts

## 1. Run locally

> Prerequisite: the backend API running, and a platform-admin account.
> The backend seed creates one: `admin@laxora.app` / `admin1234`.

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL if different
npm run dev                  # runs on http://localhost:3001
```

## 2. Environment variables

| Variable              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (no trailing slash). |

## 3. Creating a platform admin

A platform admin is just a `User` row with `isPlatformAdmin = true`.
- The backend `npm run seed` creates `admin@laxora.app` / `admin1234`.
- To promote an existing user, set the flag in the database, e.g. via Prisma Studio
  (`npx prisma studio` in the backend) or SQL:
  ```sql
  UPDATE "User" SET "isPlatformAdmin" = true WHERE email = 'you@example.com';
  ```

## 4. Deploy to Vercel
Same as the frontend: import the repo on Vercel, set `NEXT_PUBLIC_API_URL` to your
Cloud Run URL, deploy, and ensure the admin domain is in the backend's
`CORS_ORIGINS`.

## 5. Project structure
```
src/
├── app/
│   ├── login/              # admin-only sign in
│   └── (admin)/            # guarded area
│       ├── layout.tsx      # auth + isPlatformAdmin guard + sidebar
│       ├── overview/       # platform stats
│       ├── businesses/     # all tenants
│       └── users/          # all users
├── components/             # Sidebar, PageHeader
└── lib/                    # api.ts, format.ts
```

## Security note
Access control is enforced **server-side** by the `requirePlatformAdmin`
middleware on every `/api/admin/*` route — the client-side guard is only for UX.
