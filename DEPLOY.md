# Fencetastic Dashboard — Deployment Guide

## Railway Setup

### Prerequisites
- Railway account
- GitHub repo connected: git@github.com:artificialadnaan/fencetasticcrm.git
- Cloudflare R2 bucket (for photo storage in production)

### Services to Create

#### 1. PostgreSQL Database
- Add PostgreSQL plugin from Railway dashboard
- This auto-provides `DATABASE_URL`

#### 2. API Service
- Root Directory: `apps/api`
- **Build/Start Commands**: Set in Railway dashboard (railway.json may not auto-detect with Root Directory):
  - Build: `cd ../.. && npm ci && cd packages/shared && npm run build && cd ../../apps/api && npx prisma generate && npm run build`
  - Start: `npx prisma migrate deploy && node dist/index.js`
  - Health Check: `/api/health`
- Environment Variables:
  - `DATABASE_URL` — auto from PostgreSQL plugin
  - `JWT_SECRET` — generate with: `openssl rand -base64 64`
  - `FRONTEND_URL` — web service URL (e.g., `https://app.fencetastic.app`)
  - `NODE_ENV` — `production`
  - `PORT` — `3001`
  - `R2_ACCOUNT_ID` — Cloudflare R2 account ID
  - `R2_ACCESS_KEY_ID` — R2 access key
  - `R2_SECRET_ACCESS_KEY` — R2 secret key
  - `R2_BUCKET_NAME` — R2 bucket name

#### 3. Web Service
- Root Directory: `apps/web`
- **Build/Start Commands**: Set in Railway dashboard:
  - Build: `cd ../.. && npm ci && cd apps/web && npm run build`
  - Start: `npx serve dist -s -l 3000`
- Environment Variables:
  - `VITE_API_URL` — API service URL (e.g., `https://api.fencetastic.app`)

### Custom Domains
- API: `api.fencetastic.app`
- Web: `app.fencetastic.app`
- Both on same parent domain for same-site credentialed API access (cookies are host-only, not shared between subdomains — the frontend sends credentialed requests to the API origin)

### Post-Deploy Steps
1. Run database migration: `railway run -s api npx prisma migrate deploy`
2. Seed users: `railway run -s api npx tsx src/scripts/seed-users.ts`
3. Import spreadsheet data: `railway run -s api npx tsx ../../scripts/import-spreadsheet.ts`

### DNS (Hostinger)
Railway provides a CNAME target for each custom domain. Set up:
- CNAME: `app` → Railway CNAME target (from Railway dashboard for web service)
- CNAME: `api` → Railway CNAME target (from Railway dashboard for API service)
- For root domain (`fencetastic.app`), use CNAME flattening or an ALIAS record if Hostinger supports it, otherwise use the `app` subdomain

---

## Production Migration Notes

The start command runs `npx prisma migrate deploy` on every deploy before starting
the server. This is safe — `migrate deploy` is a no-op if all migrations are already applied.

**Note:** The `railway.json` files in `apps/api` and `apps/web` are provided as reference but Railway may not auto-detect them when Root Directory is set. Always verify build/start commands are configured in the Railway dashboard.

If this is the first deploy and no migrations exist yet (only `db push` has been used locally):

```bash
# From local machine with DATABASE_URL set to the Railway public URL:
cd apps/api
npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "Add initial Prisma migration for production"
git push
```

Railway will then run `migrate deploy` against that migration on the next deploy.

---

## Multi-Origin CORS

`FRONTEND_URL` on the API service supports comma-separated origins:

```
FRONTEND_URL=https://app.fencetastic.app,https://fencetastic.app
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| API service fails with "No start command" | Ensure Root Directory is set to `apps/api` in Railway settings |
| Web service blank / 404 on reload | Confirm `serve dist -s` flag is present (single-page app mode) |
| CORS errors in production | Check `FRONTEND_URL` on API matches the exact web service origin (no trailing slash) |
| `prisma migrate deploy` fails on first deploy | Create migrations locally first (see above) |
| Database connection refused | Use internal `DATABASE_URL` (Railway plugin), not the public URL, for the API service |
