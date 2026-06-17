# GoldenHour

GoldenHour is a Progressive Web Application and feature-phone SMS service that converts a single GPS-triggered emergency request into two simultaneous parallel actions:
1. Locating and confirming a hospital with the correct department and a free bed.
2. Alerting nearby replacement-blood donors of a compatible blood group.

It is built for the self-transporting family in India — the majority of emergency patients who travel to hospital by private car or auto, entirely outside any ambulance system.

## Project Structure

- `backend/`: FastAPI backend with PostgreSQL + PostGIS (via Supabase) orchestrating routing, confirmation logic, and donor matching.
- `frontend/`: React + Vite + Tailwind CSS PWA containing the Patient App, Hospital Confirmation Page, and Donor Registration interfaces.

## Setup

See `backend/README.md` and `frontend/README.md` (to be created) for specific setup instructions.

## Tags
Healthcare Technology, Social Impact, Bharat Academix CodeQuest 2026, FastApi, React, Supabase, PostGIS
