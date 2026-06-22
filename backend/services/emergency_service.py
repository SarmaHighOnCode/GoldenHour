"""Emergency orchestration — the heart of the backend.

``POST /emergency`` does four things in one call:

1. Rank the best hospitals for the patient's location + emergency type.
2. Find compatible blood donors nearby (count for the UI).
3. Persist the emergency and one confirmation request (+ link) per hospital.
4. "Send" each hospital its confirmation link.

``GET /emergency/{id}/status`` reports the live state: which hospitals have
replied, and how many donors have responded.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Dict

from blood import is_rare_group
from config import settings
from services.donor_service import match_donors
from services.hospital_service import rank_hospitals
from services.sms_service import alert_donors, deliver_confirmation_link


async def trigger_emergency(store, lat, lng, emergency_type, blood_group) -> Dict:
    """Run the full emergency fan-out and return the API response payload."""
    ranked = await rank_hospitals(store, lat, lng, emergency_type)
    donors = match_donors(store, lat, lng, blood_group)
    top_k = donors[: settings.donor_alert_k]

    # Public hospital cards (no internal scoring fields).
    cards = [
        {
            "hospital_id": c["hospital_id"],
            "name": c["name"],
            "lat": c["lat"],
            "lng": c["lng"],
            "eta_minutes": c["eta_minutes"],
            "department_match": c["department_match"],
            "distance_km": c["distance_km"],
            "status": "pending",
            "phone": c["phone"],
        }
        for c in ranked
    ]

    emergency = store.create_emergency(
        lat=lat,
        lng=lng,
        emergency_type=emergency_type,
        blood_group=blood_group,
        hospital_cards=cards,
        donors_alerted=len(top_k),
    )

    # One one-tap response token per alerted donor — opening the URL records their
    # commitment and increments donors_responded on the emergency.
    response_urls: list[str] = []
    for d in top_k:
        token = secrets.token_urlsafe(16)
        store.create_donor_alert_token(emergency["id"], d["phone"], token)
        response_urls.append(
            f"{settings.backend_url.rstrip('/')}/donor/respond/{token}"
        )
    # Route replacement donors to the nearest licensed blood bank when one is in
    # range (seeded demo cities); elsewhere the alert falls back to generic
    # "nearest licensed blood bank" guidance.
    blood_bank = store.nearest_blood_bank(lat, lng)
    alert_donors(donors, blood_group, response_urls, blood_bank=blood_bank)

    # One confirmation request + link per hospital.
    for c in ranked:
        record = c["_record"]
        # 128-bit URL-safe token — this link gates accepting/declining a patient,
        # so it must be unguessable, not a truncated uuid.
        token = secrets.token_urlsafe(16)
        store.create_confirmation(
            emergency_id=emergency["id"],
            hospital_id=c["hospital_id"],
            hospital_name=c["name"],
            token=token,
        )
        deliver_confirmation_link(
            hospital_name=c["name"],
            contact_phone=record.get("contact_phone", record.get("phone", "")),
            token=token,
        )

    return {
        "request_id": emergency["id"],
        "hospitals": cards,
        "donors_alerted": len(top_k),
        "rare_group": is_rare_group(blood_group),
    }


def get_status(store, request_id: str) -> Dict:
    """Live status of an emergency: hospital replies + donor responses."""
    emergency = store.get_emergency(request_id)
    if emergency is None:
        raise LookupError(request_id)

    # Derive each hospital's current status from its confirmation record.
    confirmations = {
        c["hospital_id"]: c for c in store.confirmations_for_emergency(request_id)
    }
    hospital_cards = []
    any_confirmed = False
    for card in emergency["hospitals"]:
        conf = confirmations.get(card["hospital_id"])
        if conf and conf["confirmed"] is True:
            status = "confirmed"
            any_confirmed = True
        elif conf and conf["confirmed"] is False:
            status = "declined"
        else:
            status = "pending"
        hospital_cards.append(
            {
                "hospital_id": card["hospital_id"],
                "name": card["name"],
                "lat": card["lat"],
                "lng": card["lng"],
                "eta_minutes": card["eta_minutes"],
                "status": status,
            }
        )

    # If nothing has confirmed within the window, tell the UI to surface the
    # nearest-hospitals 1-tap-call fallback (slide 7: "never show a false bed").
    elapsed = (datetime.now(timezone.utc) - emergency["created_at"]).total_seconds()
    unconfirmed_fallback = (
        not any_confirmed and elapsed >= settings.unconfirmed_fallback_seconds
    )

    return {
        "request_id": request_id,
        "lat": emergency["lat"],
        "lng": emergency["lng"],
        "hospitals": hospital_cards,
        "donors_alerted": emergency["donors_alerted"],
        "donors_responded": emergency["donors_responded"],
        "unconfirmed_fallback": unconfirmed_fallback,
    }
