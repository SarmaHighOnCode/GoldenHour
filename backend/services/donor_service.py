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

from datetime import date
from typing import Dict, List, Optional

from blood import compatible_donor_groups
from config import settings


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
    return store.compatible_donors_nearby(
        lat=lat,
        lng=lng,
        compatible_groups=compatible,
        radius_meters=settings.donor_radius_meters,
        cooldown_days=settings.donor_cooldown_days,
        cooldown_days_female=settings.donor_cooldown_days_female,
        today=today,
    )


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
