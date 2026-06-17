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
    HospitalConfirmRequest,
    HospitalConfirmResponse,
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


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Emergency hospital routing + replacement-blood donor alerting. "
        "One GPS-triggered request finds a hospital with the right department "
        "and a free bed, and alerts nearby compatible donors."
    ),
    lifespan=lifespan,
)
add_cors_middleware(app)


@app.get("/", tags=["meta"])
async def root():
    return {"service": settings.app_name, "version": settings.version, "docs": "/docs"}


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health_check():
    mode = "supabase" if settings.use_supabase else "in-memory"
    return HealthResponse(status="ok", version=settings.version, mode=mode)


@app.post("/emergency", response_model=EmergencyResponse, tags=["emergency"])
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
)
async def get_emergency_status(request_id: str):
    """Poll/subscribe target: live hospital replies + donor responses."""
    try:
        return emergency_service.get_status(get_store(), request_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Unknown request_id")


@app.post(
    "/confirm/{token}",
    response_model=HospitalConfirmResponse,
    tags=["confirmation"],
)
async def confirm_hospital(token: str, request: HospitalConfirmRequest):
    """A hospital contact taps Accept (true) or Not Available (false)."""
    try:
        return confirm_service.handle_confirmation(
            get_store(), token, request.accepted
        )
    except confirm_service.ConfirmationNotFound:
        raise HTTPException(status_code=404, detail="Unknown confirmation token")


@app.post("/donor/register", response_model=DonorRegisterResponse, tags=["donors"])
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
    )
    return DonorRegisterResponse(ok=True, donor_id=donor_id)


@app.post("/sms/inbound", response_model=SmsInboundResponse, tags=["sms"])
async def handle_sms_inbound(request: SmsInboundRequest):
    """Feature-phone path (stretch): parse an inbound SMS and reply."""
    reply = sms_service.handle_inbound(
        get_store(), from_number=request.from_number, body=request.body
    )
    return SmsInboundResponse(reply=reply)


@app.get("/dev/links", tags=["meta"])
async def dev_links():
    """Demo helper: the confirmation links recently 'sent' to hospitals."""
    return {"links": sms_service.recent_links}
