"""Unit tests for the algorithms: blood compatibility, geo, ranking, matching."""

import asyncio
from datetime import date, timedelta

from blood import compatible_donor_groups
from geo import haversine_km
from services.donor_service import match_donors
from services.hospital_service import rank_hospitals
from services.rate_limiter import RateLimiter
from store import get_store


# --- Rate limiter ----------------------------------------------------------
def test_rate_limiter_allows_up_to_max_then_blocks():
    limiter = RateLimiter(max_requests=3, window_seconds=60.0)
    assert [limiter.allow("ip") for _ in range(3)] == [True, True, True]
    assert limiter.allow("ip") is False  # 4th in the window is rejected
    # A different caller has its own budget.
    assert limiter.allow("other-ip") is True


def test_rate_limiter_reset_clears_budget():
    limiter = RateLimiter(max_requests=1, window_seconds=60.0)
    assert limiter.allow("ip") is True
    assert limiter.allow("ip") is False
    limiter.reset("ip")
    assert limiter.allow("ip") is True


# --- Blood compatibility ---------------------------------------------------
def test_o_negative_is_universal_donor_only_for_o_negative_recipient():
    assert compatible_donor_groups("O-") == ["O-"]


def test_ab_positive_is_universal_recipient():
    assert set(compatible_donor_groups("AB+")) == {
        "O-",
        "O+",
        "A-",
        "A+",
        "B-",
        "B+",
        "AB-",
        "AB+",
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


def test_hospital_reliability_cold_start_then_accumulates():
    # At launch a hospital has no logged confirmations -> rel is not trusted.
    store = get_store()
    assert store.hospital_reliability("h1") == (0, 0.0)

    # Two confirmations logged for the same hospital: one accept, one decline.
    store.create_confirmation("e1", "h1", "SMS Hospital", "tok-a")
    store.create_confirmation("e1", "h1", "SMS Hospital", "tok-b")
    store.record_reply("tok-a", True)
    store.record_reply("tok-b", False)
    count, rate = store.hospital_reliability("h1")
    assert count == 2 and rate == 0.5


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


def test_female_donor_has_longer_cooldown():
    # Same group, same spot, donated 100 days ago: a man is eligible (>= 90d),
    # a woman is still inside her 120-day window.
    store = get_store()
    today = date(2026, 6, 18)
    hundred_days_ago = (today - timedelta(days=100)).isoformat()
    store.add_donor(
        "Male Donor",
        "+919800000001",
        "O-",
        26.9124,
        75.7873,
        hundred_days_ago,
        sex="male",
    )
    store.add_donor(
        "Female Donor",
        "+919800000002",
        "O-",
        26.9124,
        75.7873,
        hundred_days_ago,
        sex="female",
    )

    phones = {
        d["phone"] for d in match_donors(store, 26.9124, 75.7873, "O-", today=today)
    }
    assert "+919800000001" in phones  # man: 100 days >= 90-day cooldown
    assert "+919800000002" not in phones  # woman: 100 days < 120-day cooldown
