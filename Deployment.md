# Property Management Deployment Guide

## Production Components

- PostgreSQL database
- Vercel Functions backend from `api/[...path].ts`
- React frontend from repository root

## Recommended Free Hosting

- Frontend and API: Vercel Hobby
- Database: Neon Postgres free plan through the Vercel Marketplace

## Backend Environment

```txt
DATABASE_URL=postgresql://USER:PASSWORD@HOST/property_management?sslmode=require
JWT_SECRET=use-a-long-random-production-secret
FRONTEND_ORIGIN=https://your-vercel-project.vercel.app
```

Optional frontend variable:

```txt
VITE_API_BASE_URL=/api
```

The app uses `/api` automatically in production if `VITE_API_BASE_URL` is not set.

## Vercel Deploy Steps

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Install Neon Postgres from the Vercel Marketplace or create a Neon database manually.
4. Add `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_ORIGIN` in Vercel Project Settings.
5. Deploy.

The included `vercel.json` installs root and backend dependencies, generates Prisma Client, builds the Vite frontend, and serves Express through Vercel Functions.

## Production Migration

```bash
cd backend
npx prisma migrate deploy
```

Run this once against the production `DATABASE_URL` before relying on production data.

## Local Backend Deploy Steps

Use these steps only if hosting the backend outside Vercel:

```bash
cd backend
npm ci
npx prisma migrate deploy
npm run build
npm start
```

## Verification

```bash
cd backend
API_BASE_URL=https://your-vercel-project.vercel.app/api npm run test:api
```

Manual checks:

- Sign in with a production admin account.
- Create, edit, view, and archive property records.
- Create, edit, view, and archive tenants, leases, payments, maintenance, and expenses.
- Download CSV and PDF reports.

## Database Backup

For the local Docker database:

```powershell
cd backend
npm run backup:db
```

For hosted PostgreSQL, configure scheduled `pg_dump` backups through the database provider and test restore on a staging database.
