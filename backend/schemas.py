"""Pydantic request/response models.

These mirror ``API_CONTRACT.md`` **exactly** — the field names and shapes here
are the contract the frontend builds against. Do not rename a field without
updating ``API_CONTRACT.md`` and telling the frontend owner first.
"""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

EmergencyType = Literal["trauma", "cardiac", "obstetric", "general"]
BloodGroup = Literal["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]
HospitalStatus = Literal["pending", "confirmed", "declined"]


# --- POST /emergency -------------------------------------------------------
class EmergencyRequest(BaseModel):
    lat: float
    lng: float
    emergency_type: EmergencyType
    blood_group: BloodGroup


class HospitalCard(BaseModel):
    hospital_id: str
    name: str
    eta_minutes: int
    department_match: bool
    distance_km: float
    status: HospitalStatus
    phone: str


class EmergencyResponse(BaseModel):
    request_id: str
    hospitals: List[HospitalCard]
    donors_alerted: int
    # True when the needed group is Rh-negative (scarce supply) — the UI warns
    # that compatible donors may be few and rare-group banks should be contacted.
    rare_group: bool = False


# --- GET /emergency/{request_id}/status ------------------------------------
class HospitalStatusCard(BaseModel):
    hospital_id: str
    name: str
    eta_minutes: int
    status: HospitalStatus


class EmergencyStatusResponse(BaseModel):
    request_id: str
    hospitals: List[HospitalStatusCard]
    donors_alerted: int
    donors_responded: int
    # True after the no-confirmation window elapses with nothing confirmed — cue
    # for the UI to surface the nearest-hospitals 1-tap-call fallback.
    unconfirmed_fallback: bool = False


# --- POST /confirm/{token} -------------------------------------------------
class HospitalConfirmRequest(BaseModel):
    accepted: bool


class HospitalConfirmResponse(BaseModel):
    ok: bool
    hospital_name: str
    already_confirmed: bool


# --- POST /donor/register --------------------------------------------------
class DonorRegisterRequest(BaseModel):
    name: str
    phone: str
    blood_group: BloodGroup
    lat: float
    lng: float
    last_donated: Optional[str] = None  # "YYYY-MM-DD" or null
    # Optional. Drives the post-donation cooldown: 120 days for "female",
    # 90 days otherwise. Omitting it defaults to the 90-day window.
    sex: Optional[Literal["male", "female"]] = None


class DonorRegisterResponse(BaseModel):
    ok: bool
    donor_id: str


# --- POST /sms/inbound (stretch) -------------------------------------------
class SmsInboundRequest(BaseModel):
    # The contract sends {"from": ..., "body": ...}; "from" is a reserved
    # word in Python, so we expose it as ``from_number`` with an alias.
    model_config = ConfigDict(populate_by_name=True)

    from_number: str = Field(alias="from")
    body: str


class SmsInboundResponse(BaseModel):
    reply: str


# --- GET /health -----------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    version: str
    mode: str
