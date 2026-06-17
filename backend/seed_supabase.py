"""Seed the Supabase database with the demo hospitals and donors.

Usage:
    python seed_supabase.py            # needs SUPABASE_URL + SUPABASE_ANON_KEY

Run `sql/schema.sql` first to create the tables. This inserts the same ~25
hospitals and ~180 donors used by demo mode, so the real DB and the in-memory
demo behave identically.

(Demo mode does NOT need this — the in-memory store seeds itself on boot.)
"""
from __future__ import annotations

import sys

import seed_data
from config import settings


def main() -> int:
    if not settings.use_supabase:
        print(
            "SUPABASE_URL / SUPABASE_ANON_KEY are not set. Demo mode seeds itself "
            "in-memory on boot — nothing to do here. Set them to seed a real DB."
        )
        return 0

    try:
        from supabase import create_client
    except ImportError:
        print("The 'supabase' package is required: pip install supabase")
        return 1

    client = create_client(settings.supabase_url, settings.supabase_key)

    hospitals = [
        {
            "id": h["id"],
            "name": h["name"],
            "lat": h["lat"],
            "lng": h["lng"],
            "departments": h["departments"],
            "beds_available": h["beds_available"],
            "avg_response_rate": h["avg_response_rate"],
            "phone": h["phone"],
            "contact_phone": h["contact_phone"],
        }
        for h in seed_data.hospitals()
    ]

    donors = [
        {
            "id": d["id"],
            "name": d["name"],
            "phone": d["phone"],
            "blood_group": d["blood_group"],
            "lat": d["lat"],
            "lng": d["lng"],
            "last_donated": d["last_donated"],
            "available": d["available"],
        }
        for d in seed_data.donors()
    ]

    print(f"Upserting {len(hospitals)} hospitals...")
    client.table("hospitals").upsert(hospitals).execute()
    print(f"Upserting {len(donors)} donors...")
    client.table("blood_donors").upsert(donors).execute()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
