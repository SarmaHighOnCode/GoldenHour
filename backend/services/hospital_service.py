"""Hospital ranking algorithm.

For the patient's location and the department their emergency needs, score every
nearby hospital and return the best N. The score (from the backend PRD):

    P(h) = 0.5 * prox(h) + 0.3 * dept(h) + 0.2 * rel(h)

    prox(h) = 1 - (eta / eta_max), clamped to [0, 1]   -> closer is better
    dept(h) = 1 if the needed department is present, else 0
    rel(h)  = live acceptance rate (0..1)              -> historically reliable

Cold start: rel(h) only enters the score once a hospital has logged at least
``REL_ACTIVATION_THRESHOLD`` confirmations. We have no honest reliability signal
before then, so the score degrades to proximity + department, renormalised to
span [0, 1]. At launch (no confirmations yet) ranking is pure prox + dept.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import urllib.request
from typing import Dict, List

import httpx

from config import settings
from services.geocoder import eta_minutes

logger = logging.getLogger("goldenhour.hospital_service")

# If the nearest hospital in the store is beyond this, trigger an OSM fetch.
_NEARBY_THRESHOLD_KM = 75
_OSM_RADIUS_KM = 30
# Per-mirror timeout. Mirrors are RACED concurrently (see _fetch_from_osm), so a
# single radius query takes ~the fastest healthy mirror, not the sum of
# sequential failovers — the old 20s x N series routinely outran the browser's
# fetch and surfaced as "Failed to fetch" before any hospital came back. The
# lightweight tag-only query returns in ~1.5s on a healthy mirror; this ceiling
# only bites if every fast mirror is down at once.
_OSM_TIMEOUT = 18  # seconds per endpoint

# Raced concurrently — first healthy mirror wins, the rest are cancelled.
_OSM_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
]

_DEPT_KEYWORDS: Dict[str, List[str]] = {
    "cardiac": ["cardiac", "cardio", "heart", "cardiology"],
    "trauma": [
        "trauma",
        "accident",
        "casualty",
        "surgical",
        "surgery",
        "ortho",
        "neuro",
        "neurosurgery",
    ],
    "obstetric": [
        "maternity",
        "obstet",
        "gynaec",
        "gynec",
        "women",
        "child",
        "paedia",
        "neonat",
        "birth",
        "maternal",
    ],
}
_BIG_WORDS = {
    "medical college",
    "civil hospital",
    "district hospital",
    "government hospital",
    "aiims",
    "super specialty",
    "multispeciality",
    "multi specialty",
    "gmch",
}
_SKIP_WORDS = {
    "dental",
    "eye care",
    "optical",
    "pharmacy",
    "chemist",
    "ayurved",
    "homeopath",
    "veterinar",
    "beauty",
    "cosmet",
}


def _assign_departments(name: str) -> List[str]:
    lower = name.lower()
    if any(s in lower for s in _SKIP_WORDS):
        return []
    depts: set = {"general"}
    if any(m in lower for m in ("phc", "sub centre", "sub-centre")):
        return ["general"]
    if any(m in lower for m in ("chc", "community health")):
        depts.add("obstetric")
    for dept, kws in _DEPT_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            depts.add(dept)
    if any(w in lower for w in _BIG_WORDS):
        depts.add("trauma")
    return sorted(depts)


def _parse_osm_elements(elements: list) -> List[Dict]:
    rng = random.Random()
    seen: set = set()
    hospitals: List[Dict] = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en") or tags.get("official_name")
        if not name or name.lower() in seen:
            continue
        depts = _assign_departments(name)
        if not depts:
            continue
        seen.add(name.lower())
        if el["type"] == "node":
            h_lat, h_lng = el["lat"], el["lon"]
        else:
            center = el.get("center", {})
            if not center:
                continue
            h_lat, h_lng = center["lat"], center["lon"]
        phone = tags.get("phone") or tags.get("contact:phone") or "+910000000000"
        h_id = f"osm-{el['id']}"
        hospitals.append(
            {
                "id": h_id,
                "name": name,
                "lat": round(h_lat, 5),
                "lng": round(h_lng, 5),
                "departments": depts,
                "beds_available": rng.randint(3, 15),
                "avg_response_rate": round(rng.uniform(0.65, 0.92), 2),
                "phone": phone,
                "contact_phone": phone,
            }
        )
    return hospitals


def _parse_places_results(results: list) -> List[Dict]:
    """Convert Places API (New) searchNearby results to hospital dicts."""
    rng = random.Random()
    seen: set = set()
    hospitals: List[Dict] = []
    for place in results:
        # Places API (New) uses displayName.text instead of name
        display = place.get("displayName", {})
        name = display.get("text") if isinstance(display, dict) else place.get("name")
        if not name or name.lower() in seen:
            continue
        depts = _assign_departments(name)
        if not depts:
            continue
        seen.add(name.lower())
        loc = place.get("location", {})
        h_lat, h_lng = loc.get("latitude"), loc.get("longitude")
        if h_lat is None or h_lng is None:
            continue
        place_id = place.get("id", place.get("place_id", ""))
        hospitals.append(
            {
                "id": f"gp-{place_id}",
                "name": name,
                "lat": round(h_lat, 5),
                "lng": round(h_lng, 5),
                "departments": depts,
                "beds_available": rng.randint(3, 15),
                "avg_response_rate": round(rng.uniform(0.65, 0.92), 2),
                "phone": "+910000000000",
                "contact_phone": "+910000000000",
            }
        )
    return hospitals


async def _fetch_from_google_places(lat: float, lng: float) -> List[Dict]:
    """Query Places API (New) Nearby Search. Requires GOOGLE_MAPS_API_KEY."""
    if not settings.google_maps_api_key:
        return []
    radius_m = int(_OSM_RADIUS_KM * 1000)
    url = "https://places.googleapis.com/v1/places:searchNearby"
    body = json.dumps(
        {
            "includedTypes": ["hospital"],
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": radius_m,
                }
            },
            "maxResultCount": 20,
        }
    ).encode()

    def _do():
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("X-Goog-Api-Key", settings.google_maps_api_key)
        req.add_header(
            "X-Goog-FieldMask", "places.id,places.displayName,places.location"
        )
        req.add_header("User-Agent", "GoldenHour-Emergency/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())

    try:
        logger.info(
            "Google Places fetch: lat=%s lng=%s radius=%skm", lat, lng, _OSM_RADIUS_KM
        )
        data = await asyncio.wait_for(asyncio.to_thread(_do), timeout=12)
        if "error" in data:
            logger.warning(
                "Google Places error: %s",
                data["error"].get("message", data["error"]),
            )
            return []
        hospitals = _parse_places_results(data.get("places", []))
        logger.info("Google Places fetch: %d hospitals", len(hospitals))
        return hospitals
    except Exception as exc:
        logger.warning("Google Places fetch failed (%s) — falling back to OSM", exc)
        return []


async def _fetch_hospitals_nearby(lat: float, lng: float) -> List[Dict]:
    """Google Places first (fast + accurate), Overpass as free fallback."""
    if settings.google_maps_api_key:
        hospitals = await _fetch_from_google_places(lat, lng)
        if hospitals:
            return hospitals
    return await _fetch_from_osm(lat, lng)


async def _fetch_from_osm(lat: float, lng: float) -> List[Dict]:
    """Query Overpass for hospitals near lat/lng, racing all mirrors at once.

    Mirrors are fired CONCURRENTLY and the first healthy response wins (the
    losers are cancelled). The old code tried them sequentially — mirror A
    (timeout) -> mirror B (timeout) -> ... — so a single slow mirror could
    stall the request for ``_OSM_TIMEOUT`` x N seconds, long enough that the
    browser's fetch gave up with "Failed to fetch" before any hospital came
    back. Racing caps latency at roughly the fastest healthy mirror.
    """
    r = int(_OSM_RADIUS_KM * 1000)
    a = f"{lat},{lng}"
    # Tag-only lookups (indexed, fast). The earlier `name~"PHC|CHC|..."` regex
    # subqueries forced Overpass to scan every named object in the radius, which
    # blew the server-side timeout and returned ZERO hospitals for real Indian
    # cities. Govt hospitals (PHC/CHC/Civil/District) are virtually always also
    # tagged amenity=hospital/clinic or healthcare=*, so we lose nothing and the
    # query drops from ~30s (0 results) to ~1.5s (dozens of results).
    query = (
        f"[out:json][timeout:25];\n(\n"
        f'  node["amenity"="hospital"](around:{r},{a});\n'
        f'  way["amenity"="hospital"](around:{r},{a});\n'
        f'  node["amenity"="clinic"](around:{r},{a});\n'
        f'  way["amenity"="clinic"](around:{r},{a});\n'
        f'  node["amenity"="doctors"](around:{r},{a});\n'
        f'  node["healthcare"="hospital"](around:{r},{a});\n'
        f'  way["healthcare"="hospital"](around:{r},{a});\n'
        f'  node["healthcare"="clinic"](around:{r},{a});\n'
        f'  node["healthcare"="centre"](around:{r},{a});\n'
        f");\nout center tags;\n"
    )
    logger.info(
        "OSM fetch: lat=%s lng=%s radius=%skm (racing %d mirrors)",
        lat,
        lng,
        _OSM_RADIUS_KM,
        len(_OSM_ENDPOINTS),
    )

    async def _one(endpoint: str) -> List[Dict]:
        async with httpx.AsyncClient(timeout=_OSM_TIMEOUT) as client:
            resp = await client.post(
                endpoint,
                data={"data": query},
                headers={"User-Agent": "GoldenHour-Emergency/1.0"},
            )
            resp.raise_for_status()
            return resp.json()["elements"]

    tasks = [asyncio.create_task(_one(url)) for url in _OSM_ENDPOINTS]
    try:
        for fut in asyncio.as_completed(tasks):
            try:
                elements = await fut  # first mirror to return 200 wins
            except Exception as exc:
                logger.warning("OSM mirror failed (%s), awaiting another", exc)
                continue
            hospitals = _parse_osm_elements(elements)
            logger.info("OSM fetch: %d hospitals", len(hospitals))
            return hospitals
        logger.warning("All OSM endpoints failed — no new hospitals added")
        return []
    finally:
        # Cancel the slower mirrors and drain them so cancelled tasks don't
        # surface as "Task exception was never retrieved" warnings.
        for t in tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


# emergency_type -> hospital department required to treat it
_TYPE_TO_DEPARTMENT = {
    "trauma": "trauma",
    "cardiac": "cardiac",
    "obstetric": "obstetric",
    "general": "general",
}


def _proximity_score(eta: int) -> float:
    raw = 1.0 - (eta / settings.eta_max_minutes)
    return max(0.0, min(1.0, raw))


def _score(store, hospital_id: str, prox: float, dept: float) -> float:
    """Blend proximity, department, and (only once trustworthy) reliability.

    rel(h) is the hospital's live acceptance rate, included only after it has
    logged >= REL_ACTIVATION_THRESHOLD confirmations. Until then the score is
    proximity + department, renormalised by 0.8 so it still spans [0, 1].
    """
    replied, accept_rate = store.hospital_reliability(hospital_id)
    if replied >= settings.rel_activation_threshold:
        return 0.5 * prox + 0.3 * dept + 0.2 * accept_rate
    return (0.5 * prox + 0.3 * dept) / 0.8


async def rank_hospitals(
    store,
    lat: float,
    lng: float,
    emergency_type: str,
    top_n: int | None = None,
    candidate_pool: int = 12,
) -> List[Dict]:
    """Return up to ``top_n`` ranked hospital cards, best first.

    Only the ``candidate_pool`` nearest hospitals get an ETA lookup (bounding
    external Distance-Matrix calls), then those are scored and sorted.
    """
    top_n = top_n or settings.ranking_top_n
    needed_dept = _TYPE_TO_DEPARTMENT.get(emergency_type, "general")

    # Nearest candidates by straight-line distance.
    candidates = store.hospitals_with_distance(lat, lng)
    candidates.sort(key=lambda h: h["distance_km"])

    # If the nearest hospital is far away and the store supports lazy OSM
    # fetching (InMemoryStore only — Supabase already has real data), fetch
    # hospitals near the patient's actual location on demand.
    nearest_km = candidates[0]["distance_km"] if candidates else float("inf")
    if (
        nearest_km > _NEARBY_THRESHOLD_KM
        and hasattr(store, "is_region_fetched")
        and not store.is_region_fetched(lat, lng)
    ):
        osm = await _fetch_hospitals_nearby(lat, lng)
        if osm:
            store.bulk_add_hospitals(osm)
            store.mark_region_fetched(lat, lng)
            candidates = store.hospitals_with_distance(lat, lng)
            candidates.sort(key=lambda h: h["distance_km"])

    candidates = candidates[:candidate_pool]

    # ETA lookups run concurrently. Each is an independent external call (Google
    # Distance Matrix when configured); awaiting them in a loop made POST
    # /emergency pay candidate_pool x per-call latency in series — up to ~48s once
    # real Maps is on. gather caps it at roughly the slowest single lookup.
    etas = await asyncio.gather(
        *(eta_minutes(lat, lng, h["lat"], h["lng"]) for h in candidates)
    )

    scored: List[Dict] = []
    for h, eta in zip(candidates, etas):
        dept_match = needed_dept in h.get("departments", [])
        prox = _proximity_score(eta)
        dept = 1.0 if dept_match else 0.0
        score = _score(store, h["id"], prox, dept)

        scored.append(
            {
                "hospital_id": h["id"],
                "name": h["name"],
                "eta_minutes": eta,
                "department_match": dept_match,
                "distance_km": h["distance_km"],
                "status": "pending",
                "phone": h["phone"],
                "_score": score,
                "_record": h,
            }
        )

    scored.sort(key=lambda c: c["_score"], reverse=True)
    return scored[:top_n]
