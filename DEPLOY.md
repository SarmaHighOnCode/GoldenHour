# Deploying GoldenHour (backend + database)

Two ways to run in production. Pick one.

- **Demo mode** — deploy the backend with no Supabase variables. It serves the
  seeded in-memory store (25 hospitals, 180 donors). Every endpoint works;
  nothing persists. Lowest-risk path for a hackathon demo.
- **Database mode** — back it with Supabase (PostgreSQL + PostGIS) for real
  persistence and Supabase Realtime. Do the database steps below first.

Check which mode is live any time with `GET /health` (`"mode": "supabase"` vs
`"in-memory"`) and confirm the DB is actually reachable with `GET /ready`.

---

## 1. Database — Supabase (skip for demo mode)

1. Create a project at [supabase.com](https://supabase.com) (remember the DB password).
2. **SQL Editor** → run [`backend/sql/schema.sql`](backend/sql/schema.sql) — creates
   the 4 tables, the PostGIS spatial indexes, and the `donors_nearby` RPC.
3. **SQL Editor** → run [`backend/sql/seed.sql`](backend/sql/seed.sql) — loads the
   25 hospitals + 180 donors. (Runs as table owner, so it bypasses RLS — more
   reliable than the anon-key Python seeder.)
4. Enable **Realtime** on the `confirmation_requests` table
   (Database → Replication, or the table's Realtime toggle). This is what makes
   the patient's screen flip live when a hospital accepts.
5. Collect credentials from **Project Settings**:
   - **API** → Project URL → `SUPABASE_URL`
   - **API** → `service_role` secret → `SUPABASE_SERVICE_KEY` (backend uses this)
   - **API** → `anon` public key → `SUPABASE_ANON_KEY` (frontend uses this)
   - **Database** → Connection string (URI) → `DATABASE_URL`

> Alternative to step 3: seed from your machine with
> `cd backend && python seed_supabase.py` (needs `SUPABASE_URL` +
> `SUPABASE_SERVICE_KEY` in `.env`). Prefer the SQL editor if anon RLS blocks inserts.

---

## 2. Backend — Render

The repo ships a blueprint at [`render.yaml`](render.yaml).

1. [render.com](https://render.com) → **New → Blueprint** → connect the
   `GoldenHour` repo. Render reads `render.yaml` automatically.
2. Set the `sync: false` environment variables:

   | Variable | Demo mode | Database mode |
   | --- | --- | --- |
   | `SUPABASE_URL` | *(blank)* | from Supabase |
   | `SUPABASE_SERVICE_KEY` | *(blank)* | service_role secret |
   | `SUPABASE_ANON_KEY` | *(blank)* | anon key (optional for backend) |
   | `DATABASE_URL` | *(blank)* | Supabase connection URI |
   | `GOOGLE_MAPS_API_KEY` | *(blank → estimated ETAs)* | optional, real ETAs |
   | `MSG91_AUTH_KEY` | *(blank)* | optional, SMS |
   | `FRONTEND_URL` | your frontend URL | your frontend URL |
   | `CORS_ORIGINS` | `*` or frontend URL | frontend URL |

3. **Create** and wait for the build. The API is live at
   `https://goldenhour-api.onrender.com` (or your chosen name).

The same image runs on Fly.io, or locally: `docker compose up --build`.

---

## 3. Verify

```bash
# Liveness + which mode is active
curl https://goldenhour-api.onrender.com/health
# {"status":"ok","version":"0.1.0","mode":"supabase"}

# Readiness — actually pings the database (503 if unreachable)
curl https://goldenhour-api.onrender.com/ready
# {"ready":true,"backend":"supabase"}

# Smoke-test the main flow
curl -X POST https://goldenhour-api.onrender.com/emergency \
  -H "Content-Type: application/json" \
  -d '{"lat":26.9124,"lng":75.7873,"emergency_type":"trauma","blood_group":"O+"}'
```

Interactive API docs are at `…/docs`.

---

## 4. Git flow (you are the Git owner)

Backend work lands on `backend-dev`; you merge to `main`:

```bash
git checkout main
git pull origin main
git merge backend-dev
git push origin main
```

Your teammate works only on `frontend-dev` and pushes there; you merge it into
`main` the same way. Their app reaches this backend via
`VITE_API_BASE_URL=https://goldenhour-api.onrender.com`.

---

## Security note

The backend connects with the **service-role** key (`SUPABASE_SERVICE_KEY`),
which bypasses RLS — keep it server-side only, never in the frontend. To harden
the database, enable RLS with read-only `anon` policies (see the commented block
at the end of [`backend/sql/schema.sql`](backend/sql/schema.sql)); backend writes
still succeed via the service-role key.
