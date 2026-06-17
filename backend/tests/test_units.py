"""Unit tests for the algorithms: blood compatibility, geo, ranking, matching."""
import asyncio
from datetime import date

from blood import compatible_donor_groups
from geo import haversine_km
from services.donor_service import match_donors
from services.hospital_service import rank_hospitals
from store import get_store


# --- Blood compatibility ---------------------------------------------------
def test_o_negative_is_universal_donor_only_for_o_negative_recipient():
    assert compatible_donor_groups("O-") == ["O-"]


def test_ab_positive_is_universal_recipient():
    assert set(compatible_donor_groups("AB+")) == {
        "O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"
    }


def test_a_positive_recipient_accepts_o_and_a():
    assert set(compatible_donor_groups("A+")) == {"O-", "O+", "A-", "A+"}


def test_unknown_group_fails_safe_to_empty():
    assert compatible_donor_groups("Z+") == []


# --- Geo -------------------------------------------------------------------
def test_haversine_zero_distance():
    assert haversine_km(26.9, 75.8, 26.9, 75.8) == 0.0


def test_haversine_known_distance_is_reasonable():
    # ~1 degree of latitude is ~111 km.
    km = haversine_km(26.0, 75.0, 27.0, 75.0)
    assert 110 < km < 112


# --- Hospital ranking ------------------------------------------------------
def test_ranking_returns_at_most_top_n_sorted_by_score():
    store = get_store()
    ranked = asyncio.run(rank_hospitals(store, 26.9124, 75.7873, "trauma", top_n=5))
    assert 1 <= len(ranked) <= 5
    scores = [c["_score"] for c in ranked]
    assert scores == sorted(scores, reverse=True)


def test_ranking_prefers_department_match():
    store = get_store()
    ranked = asyncio.run(rank_hospitals(store, 26.9124, 75.7873, "trauma", top_n=5))
    # At least one of the top hospitals actually has the trauma department.
    assert any(c["department_match"] for c in ranked)


# --- Donor matching --------------------------------------------------------
def test_match_donors_respects_compatibility_and_radius():
    store = get_store()
    today = date(2026, 6, 18)
    donors = match_donors(store, 26.9124, 75.7873, "O+", today=today)
    compatible = set(compatible_donor_groups("O+"))
    assert all(d["blood_group"] in compatible for d in donors)
    assert all(d["distance_m"] <= 5000 for d in donors)


def test_match_donors_excludes_recent_donations():
    store = get_store()
    today = date(2026, 6, 18)
    donors = match_donors(store, 26.9124, 75.7873, "AB+", today=today)
    for d in donors:
        if d["last_donated"]:
            days = (today - date.fromisoformat(d["last_donated"])).days
            assert days >= 90
