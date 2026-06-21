"""Application configuration.

All runtime configuration is read from environment variables so the same image
runs locally, in CI, and in production (Render/Fly) without code changes.

Nothing here is required: with an empty environment the app boots in
**demo mode** — an in-memory store seeded with Jaipur hospitals and donors, a
haversine ETA estimator, and console link delivery. Set the Supabase / Google
Maps / MSG91 variables to switch each subsystem over to the real service.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List

from dotenv import load_dotenv

load_dotenv()  # loads backend/.env into os.environ before Settings reads it


def _env_list(name: str, default: str) -> List[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # --- Core ---------------------------------------------------------------
    app_name: str = "GoldenHour API"
    version: str = "0.1.0"

    # --- Supabase / PostgreSQL + PostGIS -----------------------------------
    # When a URL + a key are present the app talks to the real database;
    # otherwise it falls back to the in-memory store (demo mode).
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    # Trusted server-side key. Preferred over the anon key for the backend's
    # reads/writes (bypasses RLS); keep it secret — never ship it to a client.
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "")

    # --- Google Maps Distance Matrix (ETA + geocoding) ---------------------
    google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # --- SMS gateway (MSG91 / Gupshup) — stretch goal ----------------------
    msg91_auth_key: str = os.getenv("MSG91_AUTH_KEY", "")

    # --- Algorithm tuning ---------------------------------------------------
    ranking_top_n: int = int(os.getenv("RANKING_TOP_N", "5"))
    eta_max_minutes: float = float(os.getenv("ETA_MAX_MINUTES", "30"))
    donor_radius_meters: float = float(os.getenv("DONOR_RADIUS_METERS", "5000"))
    # Post-donation cooldown, differentiated by sex per national blood-donation
    # guidelines: 90 days (men) / 120 days (women).
    donor_cooldown_days: int = int(os.getenv("DONOR_COOLDOWN_DAYS", "90"))
    donor_cooldown_days_female: int = int(
        os.getenv("DONOR_COOLDOWN_DAYS_FEMALE", "120")
    )
    # Nearest matched donors actually alerted per emergency (top-K).
    donor_alert_k: int = int(os.getenv("DONOR_ALERT_K", "10"))
    # rel(h) enters the hospital score only after a hospital has logged this many
    # confirmations; until then ranking degrades to proximity + department.
    rel_activation_threshold: int = int(os.getenv("REL_ACTIVATION_THRESHOLD", "20"))
    # Seconds with no confirmation before status flags the 1-tap-call fallback.
    unconfirmed_fallback_seconds: int = int(
        os.getenv("UNCONFIRMED_FALLBACK_SECONDS", "180")
    )
    city_avg_speed_kmph: float = float(os.getenv("CITY_AVG_SPEED_KMPH", "22"))

    # --- OSM startup pre-warm ----------------------------------------------
    # Semicolon-separated "lat,lng" pairs fetched from Overpass at boot (demo
    # mode only). Pre-warms the in-memory hospital store so the first emergency
    # in those areas is instant instead of waiting on an on-demand OSM fetch.
    # Example: OSM_SEED_COORDS=26.14,91.81;27.47,94.91
    osm_seed_coords: str = os.getenv("OSM_SEED_COORDS", "")

    # --- Link / message delivery -------------------------------------------
    # Where the hospital confirmation link points. The frontend serves
    # /confirm/<token>, so this is the public site URL.
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    # Where the donor one-tap response link points. This is the backend URL
    # (the response is recorded server-side when the donor opens the link).
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    # "console" (print the link), "telegram", or "msg91".
    delivery_channel: str = os.getenv("DELIVERY_CHANNEL", "console")
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # --- CORS ---------------------------------------------------------------
    cors_origins: List[str] = field(
        default_factory=lambda: _env_list("CORS_ORIGINS", "*")
    )

    @property
    def supabase_active_key(self) -> str:
        """Key the backend connects with — service-role preferred, anon fallback."""
        return self.supabase_service_key or self.supabase_key

    @property
    def use_supabase(self) -> bool:
        """True when a real Supabase backend is configured."""
        return bool(self.supabase_url and self.supabase_active_key)

    @property
    def use_google_maps(self) -> bool:
        return bool(self.google_maps_api_key)

    def summary(self) -> str:
        mode = "supabase" if self.use_supabase else "in-memory (demo)"
        eta = "google-maps" if self.use_google_maps else "haversine-estimate"
        return f"store={mode} eta={eta} delivery={self.delivery_channel}"


settings = Settings()
