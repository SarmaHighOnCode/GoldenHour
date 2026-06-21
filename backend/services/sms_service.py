"""Messaging: outbound confirmation links + inbound feature-phone SMS.

Two responsibilities:

1. **Outbound (link delivery).** When an emergency fires we create one
   confirmation link per top hospital and "send" it. For the demo the lowest-
   friction channel is chosen via ``DELIVERY_CHANNEL``: print to the console,
   post to a Telegram bot, or expose on the ``/dev/links`` page. Production
   uses MSG91/Gupshup with DLT — deliberately out of scope for the demo.

2. **Inbound (stretch).** A feature phone with no smartphone texts e.g.
   ``BLOOD O+ Malviya Nagar Jaipur``. We parse the group + locality, find the
   nearest hospitals, and reply with a plain-text list.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional

from blood import ALL_GROUPS
from config import settings
from services.geocoder import geocode_area

logger = logging.getLogger("goldenhour.sms")

# Most-recently delivered confirmation links, newest first — backs /dev/links.
recent_links: List[Dict] = []

# Most-recently dispatched donor alerts, newest first — backs /dev/alerts.
recent_alerts: List[Dict] = []

# Match blood groups in free text, longest first so "AB+" wins over "B+".
_GROUP_RE = re.compile(
    r"\b("
    + "|".join(sorted((re.escape(g) for g in ALL_GROUPS), key=len, reverse=True))
    + r")\b",
    re.IGNORECASE,
)


# --- Outbound --------------------------------------------------------------
def deliver_confirmation_link(
    hospital_name: str, contact_phone: str, token: str
) -> str:
    """Build and "send" a hospital confirmation link; return the URL."""
    link = f"{settings.frontend_url.rstrip('/')}/confirm/{token}"
    recent_links.insert(
        0, {"hospital": hospital_name, "phone": contact_phone, "link": link}
    )
    del recent_links[50:]  # keep the page short

    channel = settings.delivery_channel
    if channel == "console":
        logger.info("[CONFIRM LINK] %s -> %s", hospital_name, link)
        print(f"[CONFIRM LINK] {hospital_name} ({contact_phone}): {link}")
    elif channel == "telegram":
        _send_telegram(f"{hospital_name}: {link}")
    else:
        logger.info(
            "Link for %s queued for %s delivery: %s", hospital_name, channel, link
        )
    return link


def alert_donors(
    donors: List[Dict],
    blood_group_needed: str,
    response_urls: Optional[List[str]] = None,
) -> int:
    """ "Alert" the nearest K matched donors that blood is needed; return the count.

    Demo uses the same low-friction channels as the hospital links
    (console/Telegram/log); production swaps in MSG91/Gupshup + DLT. The message
    is explicit about the operational reality from the PRD: a donor must report
    to a hospital's LICENSED BLOOD BANK, never the emergency ward, or they will
    be turned away. This is replacement donation (hours-later), not acute supply.

    ``response_urls``, when provided, is a parallel list of one-tap links — one
    per donor in the top-K — that the donor taps to confirm they are heading out.
    """
    top = donors[: settings.donor_alert_k]
    for i, d in enumerate(top):
        tap_line = ""
        if response_urls and i < len(response_urls):
            tap_line = f" Tap to confirm you can donate: {response_urls[i]}"
        message = (
            f"GoldenHour: blood urgently needed near you (patient needs "
            f"{blood_group_needed}). If eligible, please donate at a hospital's "
            f"LICENSED BLOOD BANK - not the emergency ward. Your donation "
            f"replaces what the patient's surgery uses.{tap_line}"
        )
        recent_alerts.insert(
            0,
            {
                "phone": d["phone"],
                "blood_group": d["blood_group"],
                "distance_m": d.get("distance_m"),
                "message": message,
            },
        )
        if settings.delivery_channel == "console":
            logger.info("[DONOR ALERT] %s (%s)", d["phone"], d["blood_group"])
            print(f"[DONOR ALERT] {d['phone']} ({d['blood_group']}): {message}")
        elif settings.delivery_channel == "telegram":
            _send_telegram(message)
        else:
            logger.info(
                "Donor alert for %s queued for %s delivery",
                d["phone"],
                settings.delivery_channel,
            )
    del recent_alerts[100:]  # keep the page short
    return len(top)


def _send_telegram(text: str) -> None:
    if not (settings.telegram_bot_token and settings.telegram_chat_id):
        logger.warning("Telegram delivery requested but bot token/chat id missing")
        return
    try:
        import httpx

        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
        httpx.post(
            url,
            json={"chat_id": settings.telegram_chat_id, "text": text},
            timeout=4.0,
        )
    except Exception:
        logger.exception("Telegram delivery failed")


# --- Inbound (stretch) -----------------------------------------------------
def parse_blood_group(body: str) -> Optional[str]:
    match = _GROUP_RE.search(body)
    if not match:
        return None
    return match.group(1).upper()


def handle_inbound(store, from_number: str, body: str) -> str:
    """Parse an inbound SMS and return the reply text."""
    group = parse_blood_group(body)
    coords = geocode_area(body) or (
        store.hospitals[0]["lat"],
        store.hospitals[0]["lng"],
    )
    lat, lng = coords

    hospitals = store.hospitals_with_distance(lat, lng)
    hospitals.sort(key=lambda h: h["distance_km"])
    top = hospitals[:3]
    listed = " ".join(f"{i}) {h['name']}" for i, h in enumerate(top, start=1))

    donors_note = ""
    if group:
        from services.donor_service import match_donors

        donors = match_donors(store, lat, lng, group)
        donors_note = f" {len(donors)} donors alerted."

    return f"Nearest hospitals: {listed}.{donors_note}".strip()
