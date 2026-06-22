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

# name, lat, lng, departments
#
# NOTE: bed counts and response rates are deliberately NOT seeded. There is no
# public real-time bed feed in India, so a fabricated number would be dishonest.
# Capacity is confirmed by a human at the hospital tapping Accept on their link
# (the real signal); the schema keeps beds_available / avg_response_rate columns
# reserved for a future hospital-HIS integration but the app never populates them.
_HOSPITALS = [
    ("SMS Hospital", 26.9036, 75.8147, ["trauma", "cardiac", "general"]),
    ("Fortis Escorts Jaipur", 26.8569, 75.8064, ["cardiac", "general"]),
    (
        "Manipal Hospital Jaipur",
        26.8853,
        75.7470,
        ["trauma", "cardiac", "obstetric", "general"],
    ),
    ("Narayana Multispeciality", 26.8312, 75.8040, ["cardiac", "general"]),
    ("Eternal Hospital", 26.8665, 75.8101, ["cardiac", "trauma", "general"]),
    (
        "CK Birla Hospital (RBH)",
        26.8901,
        75.7686,
        ["trauma", "obstetric", "general"],
    ),
    ("Mahatma Gandhi Hospital", 26.7700, 75.8550, ["trauma", "general"]),
    (
        "Apex Hospital Malviya Nagar",
        26.8541,
        75.8136,
        ["general", "obstetric"],
    ),
    (
        "Santokba Durlabhji Memorial",
        26.9000,
        75.8060,
        ["trauma", "cardiac", "general"],
    ),
    ("Jaipur Golden Hospital", 26.9200, 75.8000, ["general"]),
    ("Bhandari Hospital", 26.8950, 75.7400, ["trauma", "general"]),
    (
        "Soni Manipal Hospital",
        26.8650,
        75.7560,
        ["cardiac", "obstetric", "general"],
    ),
    ("Cocoon Hospital", 26.8780, 75.7510, ["obstetric", "general"]),
    ("EHCC Hospital", 26.8492, 75.8024, ["cardiac", "trauma", "general"]),
    ("Rukmani Birla Hospital", 26.8895, 75.7690, ["obstetric", "general"]),
    ("Tagore Hospital", 26.8350, 75.7900, ["trauma", "general"]),
    ("Monilek Hospital", 26.8880, 75.8060, ["general", "obstetric"]),
    ("Imperial Hospital", 26.9300, 75.7700, ["general"]),
    ("Mital Hospital", 26.9080, 75.7990, ["general", "trauma"]),
    ("Getwell Hospital", 26.8700, 75.8200, ["general"]),
    (
        "Shalby Hospital Jaipur",
        26.8480,
        75.7720,
        ["trauma", "cardiac", "general"],
    ),
    ("Dhanwantari Hospital", 26.9150, 75.8120, ["general", "obstetric"]),
    ("Pratap Memorial Hospital", 26.9250, 75.8200, ["general"]),
    (
        "Jeevan Rekha Hospital",
        26.8600,
        75.7980,
        ["trauma", "cardiac", "general"],
    ),
    ("Marudhar Hospital", 26.9040, 75.8290, ["general", "obstetric"]),
]

# Real, licensed blood banks for the seeded demo cities (approximate coords).
# Replacement donors are routed to the NEAREST of these. Per-bank unit stock is
# not tracked (no public feed), so we direct to the nearest licensed bank rather
# than claiming a specific group is in stock — see donor_service / sms_service.
# name, lat, lng, city
_BLOOD_BANKS = [
    # Jaipur
    ("SMS Hospital Blood Bank", 26.9036, 75.8147, "Jaipur"),
    ("Santokba Durlabhji Memorial Hospital Blood Bank", 26.9000, 75.8060, "Jaipur"),
    ("Indian Red Cross Society Blood Bank, Jaipur", 26.9170, 75.8060, "Jaipur"),
    ("Fortis Escorts Hospital Blood Bank", 26.8569, 75.8064, "Jaipur"),
    ("CK Birla Hospital (RBH) Blood Bank", 26.8901, 75.7686, "Jaipur"),
    # Guwahati
    ("Gauhati Medical College Hospital Blood Bank", 26.1535, 91.7370, "Guwahati"),
    ("Indian Red Cross Society Blood Bank, Guwahati", 26.1810, 91.7550, "Guwahati"),
    ("Downtown Hospital Blood Bank", 26.1450, 91.7900, "Guwahati"),
    ("Nemcare Hospital Blood Bank", 26.1640, 91.7700, "Guwahati"),
]

_FIRST_NAMES = [
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
    "Anjali",
    "Deepak",
    "Meena",
    "Suresh",
    "Nisha",
    "Gaurav",
    "Sunita",
    "Vivek",
]
_LAST_NAMES = [
    "Verma",
    "Sharma",
    "Gupta",
    "Singh",
    "Yadav",
    "Meena",
    "Agarwal",
    "Jain",
    "Saini",
    "Choudhary",
    "Kumawat",
    "Soni",
    "Rathore",
    "Bhatt",
    "Nair",
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
    for i, (name, lat, lng, depts) in enumerate(_HOSPITALS, start=1):
        out.append(
            {
                "id": f"h{i}",
                "name": name,
                "lat": lat,
                "lng": lng,
                "departments": depts,
                "phone": f"+9114{i:07d}",
                "contact_phone": f"+9198{i:08d}",
                "confirm_token": f"hosp-{i:02d}-token",
            }
        )
    return out


def blood_banks() -> List[Dict]:
    """The seeded licensed blood banks, one dict per bank."""
    return [
        {
            "id": f"bb{i}",
            "name": name,
            "lat": lat,
            "lng": lng,
            "city": city,
        }
        for i, (name, lat, lng, city) in enumerate(_BLOOD_BANKS, start=1)
    ]


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
