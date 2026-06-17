# GoldenHour

> One tap. Two lifelines. The right hospital and the right blood — before the car even moves.

**GoldenHour** is a Progressive Web App + feature-phone SMS service that converts
a single GPS-triggered emergency request into two simultaneous, parallel actions:

1. **Locate and confirm a hospital** with the correct department and a free bed.
2. **Alert nearby replacement-blood donors** of a compatible blood group.

It is built for the **self-transporting family in India** — the majority of
emergency patients who travel to hospital by private car or auto, entirely
outside any ambulance system. The "golden hour" after a trauma is when minutes
decide outcomes; GoldenHour spends those minutes finding a hospital that can
actually take the patient instead of driving to one that can't.

**Tags:** `Healthcare Technology` · `Social Impact` · `Bharat Academix CodeQuest 2026` · `FastAPI` · `React` · `Supabase` · `PostGIS`

---

## How it works (end-to-end)

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                          PATIENT'S PHONE (PWA)                         │
   │   "Use my location" → emergency type + blood group → [ GET HELP ]      │
   └───────────────────────────────────┬──────────────────────────────────┘
                                        │  POST /emergency  { lat,lng,type,group }
                                        ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │                        GoldenHour API (FastAPI)                        │
   │                                                                        │
   │   ┌────────────────────────┐        ┌───────────────────────────┐     │
   │   │  Hospital ranking       │        │  Blood matching            │     │
   │   │  PostGIS radius + score │        │  ABO table + 5km + cooldown│     │
   │   └───────────┬────────────┘        └──────────────┬────────────┘     │
   │               │ top N hospitals                    │ compatible donors │
   │               ▼                                     ▼                   │
   │   create confirmation_requests (1 link/hospital)   count donors_alerted │
   └───────┬───────────────────────────────────┬───────────────────────────┘
           │ confirmation link                  │ live status
           ▼                                    ▼
   ┌────────────────────────┐        ┌──────────────────────────────────────┐
   │  HOSPITAL CONTACT       │        │  Back on the PATIENT'S phone          │
   │  /confirm/:token        │        │  /results/:id — cards flip live       │
   │  [Accept] / [Decline]   │──────► │  pending → CONFIRMED (poll/Realtime)  │
   └────────────────────────┘        └──────────────────────────────────────┘
```

The first hospital to **Accept** "takes" the patient; later acceptances are told
the patient is already routed. The patient's screen updates live the instant a
hospital confirms.

---

## System architecture

GoldenHour is a two-part system split cleanly by ownership, sharing one contract:

```
┌─────────────────────────────┐         ┌──────────────────────────────────────┐
│  frontend/  (React PWA)      │  HTTP   │  backend/  (FastAPI)                   │
│  4 screens, mobile-first     │ ──────► │  routes → services → data layer        │
│  React Router · Tailwind     │  JSON   │                                        │
└─────────────────────────────┘         │   ┌────────────────────────────────┐   │
              ▲                          │   │ store.py                       │   │
              │ Supabase Realtime /      │   │  • in-memory (demo, seeded)    │   │
              │ polling for live updates │   │  • Supabase + PostGIS (prod)   │   │
              └──────────────────────────┤   └────────────────────────────────┘   │
                                         │   external (prod only):                │
                                         │   Google Maps ETA · MSG91/Gupshup SMS  │
                                         └──────────────────────────────────────┘
                              shared:  API_CONTRACT.md  (exact request/response shapes)
```

- **`API_CONTRACT.md`** is the single source of truth both sides build against.
  The backend's `schemas.py` and the frontend's `fetch()` calls mirror it exactly.
- **The frontend never talks to the database** — only to the API.
- **The backend runs with zero external services in demo mode** (in-memory store
  seeded with Jaipur hospitals + donors), and swaps to Supabase/PostGIS, Google
  Maps, and an SMS gateway when their env vars are present — no code changes.

See [`backend/README.md`](backend/README.md) for the service-layer architecture
and the three algorithms, and [`frontend/README.md`](frontend/README.md) for the
screens and live-update wiring.

---

## Repository structure

```
GoldenHour/
├── API_CONTRACT.md             # SHARED contract — exact API request/response shapes
├── README.md                   # You are here
├── LICENSE
├── render.yaml                 # Backend deploy config (Render)
├── vercel.json                 # Frontend deploy config (Vercel)
├── docker-compose.yml          # One-command local backend (demo mode)
│
├── backend/                    # FastAPI service — DB, algorithms, integration
│   ├── main.py                 # Routes (thin HTTP layer)
│   ├── middleware.py           # CORS
│   ├── config.py               # Env-driven settings + demo fallbacks
│   ├── schemas.py              # Pydantic models (= API_CONTRACT.md)
│   ├── blood.py                # ABO/Rh compatibility table
│   ├── geo.py                  # Haversine distance
│   ├── store.py                # Data layer (InMemoryStore + SupabaseStore)
│   ├── seed_data.py            # ~25 hospitals + ~180 donors (deterministic)
│   ├── seed_supabase.py        # Seed a real Supabase DB
│   ├── services/               # Business logic (ranking, matching, confirm, …)
│   ├── sql/schema.sql          # PostGIS tables, indexes, RPC
│   ├── tests/                  # pytest (algorithms + contract + live flow)
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # React + Vite + Tailwind PWA
│   ├── index.html              # Shell + meta/description/OG/PWA tags
│   ├── src/
│   │   ├── App.jsx             # Mobile shell + routes
│   │   └── components/         # PatientIntake, PatientResults, HospitalConfirm, DonorRegistration
│   ├── vite.config.js
│   └── package.json
│
└── .github/workflows/          # CI: backend tests, frontend CI, PR guard
```

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, React Router, Supabase JS client |
| Backend | Python 3.12, FastAPI, Uvicorn, Pydantic v2 |
| Database | PostgreSQL + PostGIS (via Supabase), Supabase Realtime |
| Maps / ETA | Google Maps Distance Matrix API |
| Messaging | Console / Telegram (demo), MSG91 / Gupshup + DLT (production) |
| Infra | Docker, Render (API), Vercel (PWA), GitHub Actions CI |

---

## Quickstart

### Backend (demo mode — no setup, no database)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open <http://localhost:8000/docs>, trigger an emergency, and watch the hospital
confirmation links print to the console (or hit `GET /dev/links`). Run the tests
with `pytest`.

Or, with Docker, from the repo root: `docker compose up --build`.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Point it at the API by creating `frontend/.env.local` with
`VITE_API_BASE_URL=http://localhost:8000`.

---

## API at a glance

Full shapes in [`API_CONTRACT.md`](API_CONTRACT.md).

| Method & path | Purpose |
| --- | --- |
| `POST /emergency` | Trigger — rank hospitals, alert donors, send confirmation links |
| `GET /emergency/{request_id}/status` | Live status — hospital replies + donor responses |
| `POST /confirm/{token}` | Hospital taps Accept / Not Available |
| `POST /donor/register` | Register a replacement-blood donor |
| `POST /sms/inbound` | Feature-phone SMS path (stretch) |

---

## Deployment

| Component | Platform | Config |
| --- | --- | --- |
| Backend API | Render (or Fly.io) | [`render.yaml`](render.yaml) — Python runtime, `rootDir: backend` |
| Frontend PWA | Vercel | [`vercel.json`](vercel.json) — builds `frontend/`, SPA rewrites |
| Database | Supabase | Run [`backend/sql/schema.sql`](backend/sql/schema.sql), enable Realtime |

Production secrets (`SUPABASE_*`, `GOOGLE_MAPS_API_KEY`, `MSG91_AUTH_KEY`,
`VITE_API_BASE_URL`) are set in the respective dashboards — never committed.

---

## License

[MIT](LICENSE).
