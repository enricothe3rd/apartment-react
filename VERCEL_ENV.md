# Vercel Environment Variables

Set these in Vercel Project Settings > Environment Variables.

```txt
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
JWT_SECRET=use-a-long-random-secret
FRONTEND_ORIGIN=https://your-project.vercel.app
VITE_API_BASE_URL=/api
```

Use all environments:

- Production
- Preview
- Development

Do not set `PORT` on Vercel.

## Required Database Steps

Run this locally with the Neon production connection string:

```powershell
cd backend
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
npx prisma migrate deploy
npm run seed
```

## After Deploy

Open:

```txt
https://your-project.vercel.app/api/health
```

Expected:

```json
{"status":"ok","service":"property-management-backend"}
```

Then sign in:

```txt
admin@property.local
password123
```
