"""GoldenHour API — FastAPI application entrypoint.

Thin HTTP layer: each route validates input with a schema, calls one service,
and returns a schema. All business logic lives in ``services/``; all data access
lives in ``store.py``. Endpoint shapes match ``API_CONTRACT.md`` exactly.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse

from config import settings
from middleware import add_cors_middleware
from schemas import (
    DonorRegisterRequest,
    DonorRegisterResponse,
    EmergencyRequest,
    EmergencyResponse,
    EmergencyStatusResponse,
    HealthResponse,
    HospitalConfirmDetailsResponse,
    HospitalConfirmRequest,
    HospitalConfirmResponse,
    SmsInboundRequest,
    SmsInboundResponse,
)
from store import get_store

from services import confirm_service, donor_service, emergency_service, sms_service
from services.rate_limiter import RateLimiter

logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)  # suppress URLs (contain API key)
logger = logging.getLogger("goldenhour")

# Fixed-window per-client limits on the public write endpoints — generous enough
# for a panicked double-tap, tight enough to blunt a flood. In-process (single
# node); a multi-node deploy would back these with Redis.
_emergency_limiter = RateLimiter(max_requests=10, window_seconds=60.0)
_donor_limiter = RateLimiter(max_requests=10, window_seconds=60.0)
_confirm_limiter = RateLimiter(max_requests=30, window_seconds=60.0)
_donor_respond_limiter = RateLimiter(max_requests=20, window_seconds=60.0)
_RATE_LIMITERS = (
    _emergency_limiter,
    _donor_limiter,
    _confirm_limiter,
    _donor_respond_limiter,
)


def _client_key(request: Request) -> str:
    """Best-effort client identity, honoring the proxy's X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(limiter: RateLimiter):
    """Build a dependency that 429s when the caller exceeds ``limiter``."""

    async def _dependency(request: Request) -> None:
        if not limiter.allow(_client_key(request)):
            raise HTTPException(
                status_code=429, detail="Too many requests — please slow down."
            )

    return _dependency


async def _prewarm_osm() -> None:
    """Fetch hospitals from Overpass at startup for OSM_SEED_COORDS locations.

    Runs as a background task so the API is immediately ready — the pre-warm
    completes in the background. Only fires in in-memory (demo) mode; Supabase
    already has real data.
    """
    from services.hospital_service import _fetch_hospitals_nearby as _fetch_from_osm

    store = get_store()
    if not hasattr(store, "bulk_add_hospitals"):
        return  # Supabase store — skip
    if not settings.osm_seed_coords:
        return

    for pair in settings.osm_seed_coords.split(";"):
        pair = pair.strip()
        if not pair:
            continue
        try:
            lat_s, lng_s = pair.split(",")
            lat, lng = float(lat_s.strip()), float(lng_s.strip())
        except ValueError:
            logger.warning(
                "OSM_SEED_COORDS: invalid pair %r — expected 'lat,lng'", pair
            )
            continue
        if store.is_region_fetched(lat, lng):
            continue
        hospitals = await _fetch_from_osm(lat, lng)
        if hospitals:
            store.bulk_add_hospitals(hospitals)
            store.mark_region_fetched(lat, lng)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_store()  # warm the store (seed in-memory, or connect Supabase)
    logger.info("GoldenHour API ready - %s", settings.summary())
    asyncio.create_task(_prewarm_osm())
    yield


# OpenAPI tag groups — describe each section shown in /docs and /redoc.
TAGS_METADATA = [
    {
        "name": "emergency",
        "description": "Trigger an emergency and poll its live status. One request "
        "fans out into hospital ranking + blood-donor matching.",
    },
    {
        "name": "confirmation",
        "description": "A hospital contact accepts or declines a patient via a "
        "one-tap link. First to accept wins; later accepts are told it is taken.",
    },
    {
        "name": "donors",
        "description": "Register replacement-blood donors (sex sets the cooldown).",
    },
    {
        "name": "sms",
        "description": "Feature-phone fallback — parse an inbound SMS, reply with "
        "the nearest hospitals.",
    },
    {
        "name": "meta",
        "description": "Health, readiness, and demo helpers (`/dev/links`, "
        "`/dev/alerts`).",
    },
]

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    summary="Emergency hospital routing + replacement-blood donor alerting.",
    description=(
        "One GPS-triggered request finds a hospital with the right department and "
        "a free bed **and** alerts nearby compatible blood donors — two parallel "
        "actions inside the golden hour.\n\n"
        "Runs in **demo mode** with zero external services (seeded in-memory store); "
        "set the Supabase / Google Maps / SMS env vars to switch to the real stack."
    ),
    contact={
        "name": "GoldenHour — Bharat Academix CodeQuest 2026",
        "url": "https://github.com/SarmaHighOnCode/GoldenHour",
    },
    license_info={
        "name": "MIT",
        "url": "https://github.com/SarmaHighOnCode/GoldenHour/blob/main/LICENSE",
    },
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
)
add_cors_middleware(app)


@app.get("/", tags=["meta"], summary="Service info")
async def root():
    return {"service": settings.app_name, "version": settings.version, "docs": "/docs"}


@app.api_route(
    "/health",
    methods=["GET", "HEAD"],
    response_model=HealthResponse,
    tags=["meta"],
    summary="Liveness probe",
)
async def health_check():
    """Liveness — cheap, no I/O (safe for frequent platform health checks)."""
    mode = "supabase" if settings.use_supabase else "in-memory"
    return HealthResponse(status="ok", version=settings.version, mode=mode)


@app.get("/ready", tags=["meta"], summary="Readiness probe (pings the data layer)")
async def readiness_check():
    """Readiness — verifies the data layer actually answers (pings the DB).

    Use this after a deploy to confirm the API is really connected to Supabase
    and not silently running in demo mode. Returns 503 if the store is unreachable.
    """
    store = get_store()
    if not store.ping():
        raise HTTPException(status_code=503, detail="data layer unreachable")
    return {"ready": True, "backend": store.backend}


@app.post(
    "/emergency",
    response_model=EmergencyResponse,
    tags=["emergency"],
    summary="Trigger an emergency",
    dependencies=[Depends(_rate_limit(_emergency_limiter))],
)
async def trigger_emergency(request: EmergencyRequest):
    """Trigger an emergency: rank hospitals, alert donors, send confirmations."""
    store = get_store()
    return await emergency_service.trigger_emergency(
        store,
        lat=request.lat,
        lng=request.lng,
        emergency_type=request.emergency_type,
        blood_group=request.blood_group,
    )


@app.get(
    "/emergency/{request_id}/status",
    response_model=EmergencyStatusResponse,
    tags=["emergency"],
    summary="Live emergency status",
)
async def get_emergency_status(request_id: str):
    """Poll/subscribe target: live hospital replies + donor responses."""
    try:
        return emergency_service.get_status(get_store(), request_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Unknown request_id")


@app.get(
    "/confirm/{token}",
    response_model=HospitalConfirmDetailsResponse,
    tags=["confirmation"],
    summary="Confirmation details for the hospital page",
)
async def get_confirmation(token: str):
    """The emergency details a hospital sees when it opens its one-tap link."""
    try:
        return confirm_service.get_confirmation_details(get_store(), token)
    except confirm_service.ConfirmationNotFound:
        raise HTTPException(status_code=404, detail="Unknown confirmation token")


@app.post(
    "/confirm/{token}",
    response_model=HospitalConfirmResponse,
    tags=["confirmation"],
    summary="Hospital accept / decline",
    dependencies=[Depends(_rate_limit(_confirm_limiter))],
)
async def confirm_hospital(token: str, request: HospitalConfirmRequest):
    """A hospital contact taps Accept (true) or Not Available (false)."""
    try:
        return confirm_service.handle_confirmation(get_store(), token, request.accepted)
    except confirm_service.ConfirmationNotFound:
        raise HTTPException(status_code=404, detail="Unknown confirmation token")


@app.get(
    "/donor/respond/{token}",
    tags=["donors"],
    summary="Donor one-tap response",
    dependencies=[Depends(_rate_limit(_donor_respond_limiter))],
)
async def donor_respond(token: str):
    """A donor opens this link (from their alert SMS) to confirm they are heading
    to donate. Increments donors_responded on the emergency — the results screen
    picks it up on the next poll. Returns a browser-friendly HTML page."""
    ok = get_store().record_donor_response(token)
    if not ok:
        raise HTTPException(status_code=404, detail="Unknown or already used token")
    return HTMLResponse(
        """<!doctype html>
<html lang="en">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GoldenHour — Thank you!</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:420px;margin:60px auto;padding:0 24px;text-align:center;color:#1a1a1a}
  h1{font-size:2rem;margin-bottom:8px}
  p{color:#555;line-height:1.6}
  .badge{display:inline-block;background:#dc2626;color:#fff;border-radius:999px;padding:6px 18px;font-weight:700;font-size:.9rem;margin-bottom:24px}
</style>
</head>
<body>
  <div class="badge">🩸 GoldenHour</div>
  <h1>Thank you!</h1>
  <p>Your commitment has been recorded. Please head to the nearest hospital's <strong>licensed blood bank</strong> — not the emergency ward.</p>
  <p>Your donation replaces blood used in the patient's surgery and arrives hours later through proper channels.</p>
</body>
</html>"""
    )


@app.post(
    "/donor/register",
    response_model=DonorRegisterResponse,
    tags=["donors"],
    summary="Register a blood donor",
    dependencies=[Depends(_rate_limit(_donor_limiter))],
)
async def register_donor(request: DonorRegisterRequest):
    """Register a replacement-blood donor."""
    donor_id = donor_service.register_donor(
        get_store(),
        name=request.name,
        phone=request.phone,
        blood_group=request.blood_group,
        lat=request.lat,
        lng=request.lng,
        last_donated=request.last_donated,
        sex=request.sex,
    )
    return DonorRegisterResponse(ok=True, donor_id=donor_id)


@app.post(
    "/sms/inbound",
    response_model=SmsInboundResponse,
    tags=["sms"],
    summary="Inbound SMS (feature phone)",
)
async def handle_sms_inbound(request: SmsInboundRequest):
    """Feature-phone path (stretch): parse an inbound SMS and reply."""
    reply = sms_service.handle_inbound(
        get_store(), from_number=request.from_number, body=request.body
    )
    return SmsInboundResponse(reply=reply)


@app.get("/dev/links", tags=["meta"], summary="Recent hospital links (demo)")
async def dev_links():
    """Demo helper: the confirmation links recently 'sent' to hospitals."""
    return {"links": sms_service.recent_links}


@app.get("/dev/alerts", tags=["meta"], summary="Recent donor alerts (demo)")
async def dev_alerts():
    """Demo helper: the blood-needed alerts recently 'sent' to donors."""
    return {"alerts": sms_service.recent_alerts}
