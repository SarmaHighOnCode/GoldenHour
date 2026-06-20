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


def handle_confirmation(store, token: str, accepted: bool) -> Dict:
    """Apply a hospital's Accept/Decline and return the response payload.

    Persistence goes through ``store.record_reply`` so this works identically
    against the in-memory and Supabase stores.
    """
    confirmation = store.get_confirmation(token)
    if confirmation is None:
        raise ConfirmationNotFound(token)

    emergency_id = confirmation["emergency_id"]
    hospital_name = confirmation["hospital_name"]

    # Has someone else already accepted this patient?
    already_taken = store.emergency_is_taken(emergency_id)
    winner_is_someone_else = already_taken and confirmation["confirmed"] is not True

    if winner_is_someone_else:
        # Don't override the winner; just report the race result.
        return {
            "ok": True,
            "hospital_name": hospital_name,
            "already_confirmed": True,
        }

    store.record_reply(token, accepted)
    publish_confirmation(token, accepted)

    return {
        "ok": True,
        "hospital_name": hospital_name,
        "already_confirmed": False,
    }
