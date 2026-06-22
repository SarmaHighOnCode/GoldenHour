"""Hospital confirmation flow.

When a hospital contact taps Accept/Decline on their link, this resolves the
race: the first hospital to accept "takes" the patient. Any later acceptance is
told the patient has already been routed (``already_confirmed = true``) and does
not override the winner.
"""

from __future__ import annotations

from typing import Dict

from services.realtime_service import publish_confirmation


class ConfirmationNotFound(LookupError):
    """Raised when a confirmation token does not exist."""


def get_confirmation_details(store, token: str) -> Dict:
    """Return the emergency details a hospital sees when it opens its link.

    Powers the GET side of the confirmation page: the hospital's name, the
    emergency type and blood group, and this hospital's ETA — plus whether the
    patient has already been routed elsewhere and whether this hospital itself
    has already replied.
    """
    confirmation = store.get_confirmation(token)
    if confirmation is None:
        raise ConfirmationNotFound(token)

    emergency = store.get_emergency(confirmation["emergency_id"])
    emergency_type = ""
    blood_group = ""
    eta_minutes = 0
    if emergency is not None:
        emergency_type = emergency["emergency_type"]
        blood_group = emergency["blood_group"]
        for card in emergency["hospitals"]:
            if card["hospital_id"] == confirmation["hospital_id"]:
                eta_minutes = card.get("eta_minutes", 0)
                break

    confirmed = confirmation["confirmed"]  # None = pending, True/False on reply
    already_taken = store.emergency_is_taken(confirmation["emergency_id"])
    return {
        "hospital_name": confirmation["hospital_name"],
        "emergency_type": emergency_type,
        "blood_group": blood_group,
        "eta_minutes": eta_minutes,
        # Someone else won this patient (mirror the POST race semantics).
        "already_confirmed": already_taken and confirmed is not True,
        "responded": confirmed is not None,
        "accepted": confirmed is True,
    }


def handle_confirmation(store, token: str, accepted: bool) -> Dict:
    """Apply a hospital's Accept/Decline and return the response payload.

    The race is resolved atomically inside ``store.record_reply``: for an ACCEPT
    the store performs a single conditional write that only succeeds when no
    other hospital has already accepted. The return value tells us whether this
    call won or lost — no separate pre-check SELECT needed.
    """
    confirmation = store.get_confirmation(token)
    if confirmation is None:
        raise ConfirmationNotFound(token)

    hospital_name = confirmation["hospital_name"]

    recorded = store.record_reply(token, accepted)

    if accepted and not recorded:
        # Lost the race — another hospital already accepted this patient.
        return {
            "ok": True,
            "hospital_name": hospital_name,
            "already_confirmed": True,
        }

    if recorded:
        publish_confirmation(token, accepted)

    return {
        "ok": True,
        "hospital_name": hospital_name,
        "already_confirmed": False,
    }
