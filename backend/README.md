# GoldenHour — Backend

FastAPI service that turns one GPS-triggered emergency into two parallel actions:

1. **Find a hospital** with the right department and a free bed, ranked best-first, and ask each to confirm.
2. **Alert nearby compatible blood donors** who are off their post-donation cooldown.

It owns everything the user doesn't see: the database, the ranking and matching
algorithms, the confirmation/messaging flow, and live updates to the frontend.

> **Runs with zero setup.** With no environment variables the API boots in
> **demo mode** — an in-memory store seeded with ~25 Jaipur hospitals and ~180
> donors, estimated ETAs, and console link delivery. Add Supabase / Google Maps
> / SMS credentials to switch each subsystem to the real service. No code
> changes, no database required for the demo or for CI.

---

## Tech stack

| Piece | Tool | Why |
| --- | --- | --- |
| Language | Python 3.12 | — |
| API framework | FastAPI + Uvicorn | Async, fast, auto OpenAPI docs |
| Validation | Pydantic v2 | Request/response shapes = the API contract |
| Database (prod) | PostgreSQL + PostGIS via Supabase | Geography radius queries + Realtime |
| Maps / ETA (prod) | Google Maps Distance Matrix | Real drive-time ETA |
| Phone parsing | `phonenumbers` | Normalise donor numbers to E.164 |
| Container | Docker | One-command setup |

---

## Architecture

A strict three-layer design — HTTP in, services in the middle, data at the bottom:

```
                    HTTP (FastAPI routes)            ── main.py
                    │  validate with schemas.py, call ONE service, return a schema
                    ▼
                    Service layer                    ── services/
                    │  ranking · matching · confirmation · orchestration · ETA · SMS
                    ▼
                    Data layer                       ── store.py
                       in-memory now (seed_data.py) · Supabase-ready (sql/schema.sql)
```

**Rules that keep it clean:**

- **Routes are thin.** Every handler in `main.py` validates input with a schema,
  calls exactly one service function, and returns a schema. No business logic.
- **Services never touch HTTP.** They take a `store` + plain values and return
  plain dicts, so they're trivially unit-testable without a client.
- **All data access goes through `store.py`.** Its method surface mirrors what a
  Supabase-backed store would expose (`compatible_donors_nearby`,
  `create_emergency`, …), so the demo store and a real DB store are
  interchangeable behind `get_store()`.
- **Schemas are the contract.** `schemas.py` mirrors `API_CONTRACT.md` field for
  field. Change one, change both, tell the frontend owner.

### Two interchangeable stores

`store.py` ships **both** a `InMemoryStore` and a `SupabaseStore` implementing the
identical method surface; `get_store()` picks one from configuration (Supabase
when `SUPABASE_URL`/`SUPABASE_ANON_KEY` are set and reachable, in-memory
otherwise — with automatic fallback if the client can't be created, so boot
never hard-fails). The radius + scoring maths is identical whether it runs in
Python (haversine) or PostGIS (`ST_DWithin`/`ST_Distance`), so the demo runs
end-to-end with no external services, CI needs no database, and the production
path (`sql/schema.sql` + `seed_supabase.py`) is a true drop-in — no service code
changes.

---

## Repository structure

```
backend/
├── main.py                  # FastAPI app + routes (thin HTTP layer)
├── middleware.py            # CORS (origins from settings)
├── config.py                # Settings from env; demo-mode fallbacks
├── schemas.py               # Pydantic request/response models (= API_CONTRACT.md)
├── blood.py                 # ABO/Rh compatibility table
├── geo.py                   # Haversine distance helpers
├── store.py                 # Data layer: InMemoryStore + SupabaseStore + get_store()
├── seed_data.py             # Deterministic ~25 hospitals + ~180 donors
├── seed_supabase.py         # Push seed data into a real Supabase DB (anon/service key)
├── build_seed_sql.py        # Generate sql/seed.sql from seed_data.py
├── services/
│   ├── emergency_service.py # Orchestrates POST /emergency + status
│   ├── hospital_service.py  # Hospital ranking algorithm
│   ├── donor_service.py     # Blood matching + donor registration
│   ├── confirm_service.py   # Accept/decline race resolution
│   ├── geocoder.py          # ETA (Google Maps or estimate) + area geocode
│   ├── sms_service.py       # Link delivery + inbound SMS parse
│   ├── realtime_service.py  # Supabase Realtime publish (no-op in demo)
│   ├── phone_utils.py       # E.164 phone normalisation
│   ├── cache.py             # Tiny TTL cache
│   └── rate_limiter.py      # Fixed-window rate limiter
├── sql/
│   ├── schema.sql           # PostGIS tables, indexes, donors_nearby() RPC, RLS notes
│   └── seed.sql             # Generated SQL seed (run after schema.sql)
├── tests/                   # pytest: units + endpoint/contract/flow tests
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## API endpoints

All shapes are defined by [`../API_CONTRACT.md`](../API_CONTRACT.md). Interactive
docs are served at `/docs` (Swagger) and `/redoc` when the app is running.

| Method & path | Purpose |
| --- | --- |
| `POST /emergency` | Trigger an emergency — rank hospitals, alert donors, send confirmation links. |
| `GET /emergency/{request_id}/status` | Live status — hospital replies + donor responses (poll or Supabase Realtime). |
| `POST /confirm/{token}` | A hospital contact taps Accept (`true`) / Not Available (`false`). |
| `POST /donor/register` | Register a replacement-blood donor. |
| `POST /sms/inbound` | Feature-phone path (stretch): parse an SMS, reply with nearest hospitals. |
| `GET /health` | Liveness + which mode the app is running in (cheap, no I/O). |
| `GET /ready` | Readiness — pings the data layer; 503 if the DB is unreachable. |
| `GET /dev/links` | Demo helper: the confirmation links recently "sent" to hospitals. |

---

## The three algorithms

**1. Hospital ranking** (`services/hospital_service.py`) — for the needed
department, score each nearby hospital and return the top N:

```
P(h) = 0.5 · prox(h) + 0.3 · dept(h) + 0.2 · rel(h)

prox(h) = 1 − (eta / eta_max), clamped to [0, 1]   # closer is better
dept(h) = 1 if the needed department is present else 0
rel(h)  = avg_response_rate                          # historically reliable
```

**2. Blood matching** (`services/donor_service.py` + `blood.py`) — compatible
donor groups (hardcoded ABO table), available, within 5 km, and off the 90-day
cooldown (`last_donated IS NULL OR last_donated < today − 90d`), nearest first.

**3. Confirmation flow** (`services/confirm_service.py`) — the first hospital to
accept "takes" the patient; any later acceptance gets `already_confirmed: true`
and does not override the winner. The accepted hospital's status flips
`pending → confirmed`, which the frontend sees via polling or Realtime.

---

## Running it

### Local (demo mode, no setup)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open <http://localhost:8000/docs>. Trigger an emergency and watch the
confirmation links print to the console (or hit `GET /dev/links`).

### Docker

```bash
# from repo root
docker compose up --build         # backend on :8000

# or just the backend image
cd backend && docker build -t goldenhour-api . && docker run -p 8000:8000 goldenhour-api
```

### With a real Supabase + Maps stack

1. Create a Supabase project; run [`sql/schema.sql`](sql/schema.sql) in the SQL editor.
2. Run [`sql/seed.sql`](sql/seed.sql) in the SQL editor to load hospitals + donors
   (or `python seed_supabase.py` from your machine).
3. Enable **Realtime** on the `confirmation_requests` table.
4. Copy `.env.example` → `.env` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   (preferred for the backend), `GOOGLE_MAPS_API_KEY` (and `MSG91_AUTH_KEY` for SMS).
5. Start the app — `GET /health` reports `"mode": "supabase"`; `GET /ready`
   confirms the DB is reachable.

See [`../DEPLOY.md`](../DEPLOY.md) for the full Render + Supabase runbook.

---

## Configuration

Everything is environment-driven (see [`.env.example`](.env.example)). Highlights:

| Variable | Default | Effect |
| --- | --- | --- |
| `SUPABASE_URL` + a key | — | Set URL + a key → use the real database. |
| `SUPABASE_SERVICE_KEY` | — | Preferred backend key (bypasses RLS); falls back to anon. |
| `SUPABASE_ANON_KEY` | — | Anon key; used if no service key is set. |
| `GOOGLE_MAPS_API_KEY` | — | Set → real drive-time ETAs (else estimated). |
| `DELIVERY_CHANNEL` | `console` | `console` \| `telegram` \| `msg91`. |
| `FRONTEND_URL` | `http://localhost:5173` | Base for `/confirm/<token>` links. |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. |
| `DONOR_RADIUS_METERS` | `5000` | Donor search radius. |
| `DONOR_COOLDOWN_DAYS` | `90` | Post-donation ineligibility window. |
| `RANKING_TOP_N` | `5` | Hospitals returned per emergency. |

---

## Testing

```bash
cd backend
pip install -r requirements-dev.txt
pytest                # 26 tests: algorithms + endpoint contract + live flow + Supabase path
```

The suite runs fully offline (no Supabase, no network) and verifies the exact
`API_CONTRACT.md` response shapes, the ranking/matching algorithms, and the
end-to-end emergency → confirm → status flip. The **`SupabaseStore` production
path is also tested** against a fake supabase client
(`tests/fake_supabase.py`), so column names, query chains, and key mapping are
verified without a live database. CI runs the same suite on Python 3.11 and 3.12.

---

## Deployment

[`../render.yaml`](../render.yaml) defines the Render web service (Python runtime,
`rootDir: backend`, `uvicorn main:app`). Set the `SUPABASE_*`, `GOOGLE_MAPS_API_KEY`,
and `MSG91_AUTH_KEY` env vars in the Render dashboard. The same Docker image runs
on Fly.io.
