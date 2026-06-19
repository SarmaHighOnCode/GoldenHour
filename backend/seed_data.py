"""Deterministic seed data for demo mode and for the SQL seed script.

~25 real Jaipur hospitals with approximate coordinates and varied departments,
plus ~180 donors spread across all 8 blood groups and varied distances. The
``last_donated`` dates are deliberately spread so the sex-aware cooldown filter
(90 days men / 120 days women) visibly excludes some donors (the eligibility
logic actually does something in the demo).

Generation is seeded, so every boot and every run of ``seed_supabase.py``
produces the same dataset — reproducible demos, stable tests.
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from typing import Dict, List

from blood import ALL_GROUPS

# Jaipur city centre — donors and hospitals scatter around this point.
JAIPUR_LAT = 26.9124
JAIPUR_LNG = 75.7873

DEPARTMENTS = ["trauma", "cardiac", "obstetric", "general"]

# name, lat, lng, departments, beds_available, avg_response_rate
_HOSPITALS = [
    ("SMS Hospital", 26.9036, 75.8147, ["trauma", "cardiac", "general"], 12, 0.92),
    ("Fortis Escorts Jaipur", 26.8569, 75.8064, ["cardiac", "general"], 8, 0.88),
    ("Manipal Hospital Jaipur", 26.8853, 75.7470, ["trauma", "cardiac", "obstetric", "general"], 15, 0.90),
    ("Narayana Multispeciality", 26.8312, 75.8040, ["cardiac", "general"], 6, 0.81),
    ("Eternal Hospital", 26.8665, 75.8101, ["cardiac", "trauma", "general"], 9, 0.86),
    ("CK Birla Hospital (RBH)", 26.8901, 75.7686, ["trauma", "obstetric", "general"], 11, 0.89),
    ("Mahatma Gandhi Hospital", 26.7700, 75.8550, ["trauma", "general"], 7, 0.78),
    ("Apex Hospital Malviya Nagar", 26.8541, 75.8136, ["general", "obstetric"], 5, 0.74),
    ("Santokba Durlabhji Memorial", 26.9000, 75.8060, ["trauma", "cardiac", "general"], 10, 0.83),
    ("Jaipur Golden Hospital", 26.9200, 75.8000, ["general"], 4, 0.70),
    ("Bhandari Hospital", 26.8950, 75.7400, ["trauma", "general"], 6, 0.76),
    ("Soni Manipal Hospital", 26.8650, 75.7560, ["cardiac", "obstetric", "general"], 8, 0.84),
    ("Cocoon Hospital", 26.8780, 75.7510, ["obstetric", "general"], 5, 0.79),
    ("EHCC Hospital", 26.8492, 75.8024, ["cardiac", "trauma", "general"], 9, 0.85),
    ("Rukmani Birla Hospital", 26.8895, 75.7690, ["obstetric", "general"], 7, 0.82),
    ("Tagore Hospital", 26.8350, 75.7900, ["trauma", "general"], 6, 0.75),
    ("Monilek Hospital", 26.8880, 75.8060, ["general", "obstetric"], 4, 0.72),
    ("Imperial Hospital", 26.9300, 75.7700, ["general"], 3, 0.68),
    ("Mital Hospital", 26.9080, 75.7990, ["general", "trauma"], 5, 0.73),
    ("Getwell Hospital", 26.8700, 75.8200, ["general"], 4, 0.71),
    ("Shalby Hospital Jaipur", 26.8480, 75.7720, ["trauma", "cardiac", "general"], 8, 0.80),
    ("Dhanwantari Hospital", 26.9150, 75.8120, ["general", "obstetric"], 5, 0.74),
    ("Pratap Memorial Hospital", 26.9250, 75.8200, ["general"], 3, 0.69),
    ("Jeevan Rekha Hospital", 26.8600, 75.7980, ["trauma", "cardiac", "general"], 7, 0.81),
    ("Marudhar Hospital", 26.9040, 75.8290, ["general", "obstetric"], 4, 0.72),
]

_FIRST_NAMES = [
    "Asha", "Rohan", "Priya", "Amit", "Neha", "Vikram", "Pooja", "Rahul",
    "Sneha", "Arjun", "Kavya", "Manish", "Divya", "Sanjay", "Ritu", "Karan",
    "Anjali", "Deepak", "Meena", "Suresh", "Nisha", "Gaurav", "Sunita", "Vivek",
]
_LAST_NAMES = [
    "Verma", "Sharma", "Gupta", "Singh", "Yadav", "Meena", "Agarwal", "Jain",
    "Saini", "Choudhary", "Kumawat", "Soni", "Rathore", "Bhatt", "Nair",
]


def _scatter(rng: random.Random, max_km: float) -> tuple[float, float]:
    """A random point within ``max_km`` of Jaipur centre."""
    # ~111 km per degree latitude; longitude scaled by cos(latitude).
    radius_deg = (max_km / 111.0) * (rng.random() ** 0.5)  # sqrt for uniform area
    angle = rng.uniform(0, 2 * 3.14159265)
    import math

    dlat = radius_deg * math.cos(angle)
    dlng = radius_deg * math.sin(angle) / math.cos(math.radians(JAIPUR_LAT))
    return round(JAIPUR_LAT + dlat, 5), round(JAIPUR_LNG + dlng, 5)


def hospitals() -> List[Dict]:
    """The seeded hospital list, one dict per hospital."""
    out: List[Dict] = []
    for i, (name, lat, lng, depts, beds, rel) in enumerate(_HOSPITALS, start=1):
        out.append(
            {
                "id": f"h{i}",
                "name": name,
                "lat": lat,
                "lng": lng,
                "departments": depts,
                "beds_available": beds,
                "avg_response_rate": rel,
                "phone": f"+9114{i:07d}",
                "contact_phone": f"+9198{i:08d}",
                "confirm_token": f"hosp-{i:02d}-token",
            }
        )
    return out


def donors(count: int = 180, seed: int = 42) -> List[Dict]:
    """``count`` seeded donors spread across all 8 blood groups."""
    rng = random.Random(seed)
    today = date(2026, 6, 18)
    out: List[Dict] = []
    for i in range(1, count + 1):
        lat, lng = _scatter(rng, max_km=12.0)
        group = ALL_GROUPS[i % len(ALL_GROUPS)]
        sex = "female" if rng.random() < 0.5 else "male"

        # Spread donation history: ~25% never donated, the rest 10–200 days ago
        # so some fall inside the cooldown (90d men / 120d women) and some don't.
        roll = rng.random()
        if roll < 0.25:
            last_donated = None
        else:
            days_ago = rng.randint(10, 200)
            last_donated = (today - timedelta(days=days_ago)).isoformat()

        out.append(
            {
                "id": f"d{i}",
                "name": f"{rng.choice(_FIRST_NAMES)} {rng.choice(_LAST_NAMES)}",
                "phone": f"+9199{i:08d}",
                "blood_group": group,
                "lat": lat,
                "lng": lng,
                "last_donated": last_donated,
                "sex": sex,
                "available": True,
            }
        )
    return out
