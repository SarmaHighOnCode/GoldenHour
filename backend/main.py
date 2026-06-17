from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from middleware import add_cors_middleware

app = FastAPI(title="GoldenHour API")
add_cors_middleware(app)

class EmergencyRequest(BaseModel):
    lat: float
    lng: float
    emergency_type: str
    blood_group: str

class HospitalConfirmRequest(BaseModel):
    accepted: bool

class DonorRegisterRequest(BaseModel):
    name: str
    phone: str
    blood_group: str
    lat: float
    lng: float
    last_donated: Optional[str] = None

class SmsInboundRequest(BaseModel):
    from_number: str
    body: str

@app.post("/emergency")
async def trigger_emergency(request: EmergencyRequest):
    return {
        "request_id": "abc123",
        "hospitals": [],
        "donors_alerted": 0
    }

@app.get("/emergency/{request_id}/status")
async def get_emergency_status(request_id: str):
    return {
        "request_id": request_id,
        "hospitals": [],
        "donors_alerted": 0,
        "donors_responded": 0
    }

@app.post("/confirm/{token}")
async def confirm_hospital(token: str, request: HospitalConfirmRequest):
    return {
        "ok": True,
        "hospital_name": "Test Hospital",
        "already_confirmed": False
    }

@app.post("/donor/register")
async def register_donor(request: DonorRegisterRequest):
    return {"ok": True, "donor_id": "d123"}

@app.post("/sms/inbound")
async def handle_sms_inbound(request: SmsInboundRequest):
    return {"reply": "Nearest hospitals: ..."}

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
