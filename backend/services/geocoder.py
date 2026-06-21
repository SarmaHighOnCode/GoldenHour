"""ETA + geocoding.

Production uses the Google Maps Distance Matrix API for a real drive-time ETA.
Without an API key (CI, local demo) we estimate ETA from straight-line distance
and an average city speed — good enough to rank hospitals and show a plausible
"6 min" badge.
"""

from __future__ import annotations

import math
from typing import Optional, Tuple

from config import settings
from geo import haversine_km

# Coarse centroids for the Jaipur localities a feature-phone SMS might name.
# Used only by the SMS path when no Google geocoding key is configured.
_KNOWN_AREAS = {
    "malviya nagar": (26.8541, 75.8136),
    "vaishali nagar": (26.9115, 75.7370),
    "mansarovar": (26.8505, 75.7628),
    "c scheme": (26.9100, 75.7950),
    "raja park": (26.8980, 75.8290),
    "jagatpura": (26.8200, 75.8600),
    "tonk road": (26.8400, 75.8000),
    "sodala": (26.9050, 75.7700),
    "jaipur": (26.9124, 75.7873),
}


def estimate_eta_minutes(distance_km: float) -> int:
    """Drive-time estimate from straight-line distance.

    Applies a 1.3x road-winding factor to the great-circle distance, then
    divides by the configured average city speed. Always at least 1 minute.
    """
    road_km = distance_km * 1.3
    minutes = (road_km / settings.city_avg_speed_kmph) * 60.0
    return max(1, math.ceil(minutes))


async def eta_minutes(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> int:
    """ETA in minutes, via Google Maps when configured, else estimated."""
    if settings.use_google_maps:
        eta = await _google_eta(origin_lat, origin_lng, dest_lat, dest_lng)
        if eta is not None:
            return eta
    return estimate_eta_minutes(
        haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    )


async def _google_eta(
    o_lat: float, o_lng: float, d_lat: float, d_lng: float
) -> Optional[int]:
    """Call Google Distance Matrix; return minutes or None on any failure."""
    try:
        import httpx

        params = {
            "origins": f"{o_lat},{o_lng}",
            "destinations": f"{d_lat},{d_lng}",
            "mode": "driving",
            "departure_time": "now",
            "key": settings.google_maps_api_key,
        }
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
        element = data["rows"][0]["elements"][0]
        if element.get("status") != "OK":
            return None
        seconds = element["duration"]["value"]
        return max(1, round(seconds / 60.0))
    except Exception:
        # Never let an external API failure break an emergency response.
        return None


def geocode_area(text: str) -> Optional[Tuple[float, float]]:
    """Best-effort geocode of a free-text Jaipur locality (SMS path)."""
    lowered = text.lower()
    for area, coords in _KNOWN_AREAS.items():
        if area in lowered:
            return coords
    return None
