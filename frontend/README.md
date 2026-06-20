# GoldenHour — Frontend

The mobile-first PWA that everything the user touches lives in: a panicked
family member triggers an emergency, watches hospitals respond live, and a
hospital contact accepts the patient — all on a phone screen.

Built with **React + Vite + Tailwind CSS** and **React Router**. Every API call
matches [`../API_CONTRACT.md`](../API_CONTRACT.md) exactly.

---

## Tech stack

| Piece | Tool | Why |
| --- | --- | --- |
| Framework | React 19 + Vite | Fast dev server, instant HMR |
| Styling | Tailwind CSS | Clean, mobile-friendly utility classes |
| Routing | React Router | Switch between the four screens |
| Live updates | Supabase JS client / polling | Cards flip live when a hospital confirms |

---

## The four screens

Each is a route rendered inside a shared mobile shell (`src/App.jsx`):

| Route | Component | What it does |
| --- | --- | --- |
| `/` | `PatientIntakeView` | Emergency intake — "Use my location" (Geolocation API), emergency type + blood group dropdowns, big **GET HELP** button → `POST /emergency`, navigates to `/results/:id`. |
| `/results/:id` | `PatientResultsView` | Live results — list of hospital cards (name, ETA badge, department match, status badge `pending`/`confirmed`/`declined`, 1-tap call button) and a blood-donor panel. Cards update live. |
| `/confirm/:token` | `HospitalConfirmPage` | The hospital contact's view — emergency type · blood group · ETA, **Accept Patient** / **Not Available** → `POST /confirm/{token}`. Shows "already routed" when `already_confirmed` is true. |
| `/register` | `DonorRegistration` | One-screen donor sign-up form → `POST /donor/register`. |

> **Status:** screens are built and navigable; they currently render placeholder
> data per the "fake data first" approach in the PRD. Wiring the real `fetch()`
> calls against the backend is the remaining integration step — because each
> screen is built against the contract shapes, swapping fake data for `fetch()`
> is a localized change.

### Live updates

When a hospital taps **Accept** on `/confirm/:token`, the matching card on
`/results/:id` must flip `pending → confirmed` without a refresh. Two options
(agree with the backend owner which to ship):

- **Polling** — call `GET /emergency/{id}/status` every ~3 s and re-render.
- **Supabase Realtime** — subscribe to the `confirmation_requests` table and
  update the matching card when a row changes.

Start with polling; upgrade to Realtime if there's time.

---

## Repository structure

```
frontend/
├── index.html               # App shell + meta/description/OG/PWA tags
├── src/
│   ├── main.jsx             # React entrypoint
│   ├── App.jsx              # Mobile shell + React Router routes
│   ├── components/
│   │   ├── PatientIntakeView.jsx     # Screen 1  (/)
│   │   ├── PatientResultsView.jsx    # Screen 2  (/results/:id)
│   │   ├── HospitalConfirmPage.jsx   # Screen 4  (/confirm/:token)
│   │   └── DonorRegistration.jsx     # Screen 3  (/register)
│   ├── index.css            # Tailwind entry
│   └── assets/              # Images / icons
├── public/                  # favicon, static icons
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## Running it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build` (production build → `dist/`), `npm run preview`
(serve the build), `npm run lint`.

### Talking to the backend

The API base URL is supplied via a Vite env var. Create `frontend/.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000
```

In production set it to the deployed backend, e.g.
`https://goldenhour-api.onrender.com`. Read it in code with
`import.meta.env.VITE_API_BASE_URL`. (The backend has CORS open for the
frontend origin, so cross-port calls in dev just work.)

---

## Deployment

Deployed on Vercel — see [`../vercel.json`](../vercel.json). It builds
`frontend/` and rewrites all routes to `index.html` so React Router's client-side
routes (`/results/:id`, `/confirm/:token`, …) resolve on hard refresh and
deep links. Set `VITE_API_BASE_URL` as a Vercel environment variable.
