"""Live updates to the frontend.

In production the frontend subscribes to the Supabase ``confirmation_requests``
table via Supabase Realtime. When a hospital accepts and we flip
``confirmed = true``, Supabase pushes the row change and the patient's card
flips live with no page refresh.

In demo mode there is no Supabase, so the frontend polls
``GET /emergency/{id}/status`` instead and this module is a logging no-op. The
function signature is identical either way, so wiring real Realtime later is a
drop-in change.
"""

from __future__ import annotations

import logging

from config import settings

logger = logging.getLogger("goldenhour.realtime")


def publish_confirmation(token: str, confirmed: bool) -> None:
    """Announce that a hospital replied to a confirmation request.

    With Supabase configured this would write the row so Realtime fires; in
    demo mode polling already sees the in-memory change, so we just log.
    """
    if settings.use_supabase:
        # A SupabaseStore writes confirmed/replied_at; Realtime emits the change.
        logger.info("Realtime: confirmation %s -> confirmed=%s", token, confirmed)
    else:
        logger.debug(
            "Demo (polling): confirmation %s -> confirmed=%s", token, confirmed
        )
