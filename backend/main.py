"""GoldenHour API — FastAPI application entrypoint.

Thin HTTP layer: each route validates input with a schema, calls one service,
and returns a schema. All business logic lives in ``services/``; all data access
lives in ``store.py``. Endpoint shapes match ``API_CONTRACT.md`` exactly.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

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
    SmsInboundRequest,
    SmsInboundResponse,
)
from store import get_store

from services import confirm_service, donor_service, emergency_service, sms_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("goldenhour")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_store()  # warm the store (seed in-memory, or connect Supabase)
    logger.info("GoldenHour API ready - %s", settings.summary())
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


@app.get("/health", response_model=HealthResponse, tags=["meta"], summary="Liveness probe")
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
    summary="Get confirmation request details",
)
async def get_confirmation_details(token: str):
    """Retrieve details of an emergency for the confirmation screen."""
    store = get_store()
    conf = store.get_confirmation(token)
    if conf is None:
        raise HTTPException(status_code=404, detail="Unknown confirmation token")
    
    emergency = store.get_emergency(conf["emergency_id"])
    if emergency is None:
        raise HTTPException(status_code=404, detail="Associated emergency not found")
    
    # Find the specific hospital ETA from the snapshot
    eta = 5  # default fallback
    for card in emergency["hospitals"]:
        if card["hospital_id"] == conf["hospital_id"]:
            eta = card["eta_minutes"]
            break
    
    # Check if the emergency has already been taken by another hospital
    already_taken = store.emergency_is_taken(conf["emergency_id"])
    
    # If this hospital already confirmed/declined, show it as responded
    responded = conf["confirmed"] is not None
    accepted = conf["confirmed"] is True
    
    return HospitalConfirmDetailsResponse(
        hospital_name=conf["hospital_name"],
        emergency_type=emergency["emergency_type"],
        blood_group=emergency["blood_group"],
        eta_minutes=eta,
        already_confirmed=already_taken and conf["confirmed"] is not True,
        responded=responded,
        accepted=accepted
    )
@app.post(
    "/confirm/{token}",
    response_model=HospitalConfirmResponse,
    tags=["confirmation"],
    summary="Hospital accept / decline",
)
async def confirm_hospital(token: str, request: HospitalConfirmRequest):
    """A hospital contact taps Accept (true) or Not Available (false)."""
    try:
        return confirm_service.handle_confirmation(
            get_store(), token, request.accepted
        )
    except confirm_service.ConfirmationNotFound:
        raise HTTPException(status_code=404, detail="Unknown confirmation token")


@app.post(
    "/donor/register",
    response_model=DonorRegisterResponse,
    tags=["donors"],
    summary="Register a blood donor",
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
