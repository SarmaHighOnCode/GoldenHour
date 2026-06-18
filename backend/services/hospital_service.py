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

from typing import Dict, List

from config import settings
from services.geocoder import eta_minutes

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
    candidates = candidates[:candidate_pool]

    scored: List[Dict] = []
    for h in candidates:
        eta = await eta_minutes(lat, lng, h["lat"], h["lng"])
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
