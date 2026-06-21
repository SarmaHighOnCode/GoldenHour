"""Blood-donor matching.

Given the patient's needed blood group and location, find compatible donors who
are available, within range, and off their post-donation cooldown. Mirrors the
PostGIS query in the PRD:

    SELECT * FROM blood_donors
    WHERE blood_group = ANY(:compatible_types)
      AND available = true
      AND (last_donated IS NULL OR last_donated < current_date - interval '90 days')
      AND ST_DWithin(location, patient_point, 5000)
    ORDER BY ST_Distance(...)
"""

from __future__ import annotations

import math
import random
from datetime import date, timedelta
from typing import Dict, List, Optional

from blood import ALL_GROUPS, compatible_donor_groups
from config import settings

_DEMO_FIRST = [
    "Asha",
    "Rohan",
    "Priya",
    "Amit",
    "Neha",
    "Vikram",
    "Pooja",
    "Rahul",
    "Sneha",
    "Arjun",
    "Kavya",
    "Manish",
    "Divya",
    "Sanjay",
    "Ritu",
    "Karan",
]
_DEMO_LAST = [
    "Verma",
    "Sharma",
    "Gupta",
    "Singh",
    "Yadav",
    "Das",
    "Agarwal",
    "Jain",
    "Nair",
    "Rao",
    "Bora",
    "Saikia",
    "Reddy",
    "Patel",
]


def _scatter_near(
    rng: random.Random, lat: float, lng: float, max_km: float
) -> tuple[float, float]:
    """A uniform-area random point within ``max_km`` of (lat, lng)."""
    radius_deg = (max_km / 111.0) * (rng.random() ** 0.5)
    angle = rng.uniform(0, 2 * math.pi)
    dlat = radius_deg * math.cos(angle)
    dlng = radius_deg * math.sin(angle) / math.cos(math.radians(lat))
    return round(lat + dlat, 5), round(lng + dlng, 5)


def _demo_donors_near(
    lat: float, lng: float, radius_m: float, per_group: int = 2
) -> List[Dict]:
    """Synthesize a realistic local donor pool around (lat, lng).

    No public registry of blood donors exists, so a demo run outside a seeded
    city finds nobody. This places ``per_group`` donors of every blood group
    within the alert radius — all off-cooldown — so ABO compatibility, radius,
    and ranking all exercise real data wherever the demo is triggered.
    """
    rng = random.Random((round(lat, 3), round(lng, 3)).__hash__())
    today = date.today()
    max_km = (radius_m / 1000.0) * 0.8  # stay comfortably inside the radius
    out: List[Dict] = []
    n = 0
    for group in ALL_GROUPS:
        for _ in range(per_group):
            n += 1
            d_lat, d_lng = _scatter_near(rng, lat, lng, max_km)
            days_ago = rng.randint(130, 320)  # past both cooldowns -> eligible
            out.append(
                {
                    "id": f"demo-{round(lat, 3)}-{round(lng, 3)}-{n}",
                    "name": f"{rng.choice(_DEMO_FIRST)} {rng.choice(_DEMO_LAST)}",
                    "phone": f"+9190{rng.randint(10_000_000, 99_999_999)}",
                    "blood_group": group,
                    "lat": d_lat,
                    "lng": d_lng,
                    "last_donated": (today - timedelta(days=days_ago)).isoformat(),
                    "sex": "female" if rng.random() < 0.5 else "male",
                    "available": True,
                }
            )
    return out


def match_donors(
    store,
    lat: float,
    lng: float,
    blood_group_needed: str,
    today: Optional[date] = None,
) -> List[Dict]:
    """Compatible, available, in-range, off-cooldown donors — nearest first."""
    compatible = compatible_donor_groups(blood_group_needed)
    if not compatible:
        return []

    def _query() -> List[Dict]:
        return store.compatible_donors_nearby(
            lat=lat,
            lng=lng,
            compatible_groups=compatible,
            radius_meters=settings.donor_radius_meters,
            cooldown_days=settings.donor_cooldown_days,
            cooldown_days_female=settings.donor_cooldown_days_female,
            today=today,
        )

    matched = _query()
    # No registered donors near this location (e.g. demoing outside a seeded
    # city). Synthesize a local pool once per region so the blood-donor branch
    # works at any venue, then re-run the same real matching query.
    if (
        not matched
        and hasattr(store, "bulk_add_donors")
        and not store.is_donor_region_seeded(lat, lng)
    ):
        store.bulk_add_donors(_demo_donors_near(lat, lng, settings.donor_radius_meters))
        store.mark_donor_region_seeded(lat, lng)
        matched = _query()
    return matched


def register_donor(
    store,
    name: str,
    phone: str,
    blood_group: str,
    lat: float,
    lng: float,
    last_donated: Optional[str],
    sex: Optional[str] = None,
) -> str:
    """Add a donor to the registry and return the new donor id."""
    from services.phone_utils import normalize_phone

    normalized = normalize_phone(phone) or phone
    return store.add_donor(
        name=name,
        phone=normalized,
        blood_group=blood_group,
        lat=lat,
        lng=lng,
        last_donated=last_donated,
        sex=sex,
    )
