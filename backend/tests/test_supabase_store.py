"""Verify the production SupabaseStore logic against a fake supabase client.

Exercises the same emergency -> confirm -> status flow as the in-memory tests,
but through ``SupabaseStore`` query chains, proving column names and key mapping
(e.g. blood_group_needed, hospitals jsonb, hospital_name) are correct.
"""
import asyncio

from blood import compatible_donor_groups
from services import confirm_service, emergency_service
from store import SupabaseStore
from tests.fake_supabase import FakeSupabaseClient


def _store():
    return SupabaseStore(FakeSupabaseClient())


def test_ping_ok():
    assert _store().ping() is True


def test_hospitals_with_distance_reads_table():
    store = _store()
    rows = store.hospitals_with_distance(26.9124, 75.7873)
    assert len(rows) == 25
    assert all("distance_km" in r for r in rows)


def test_compatible_donors_nearby_via_rpc():
    store = _store()
    donors = store.compatible_donors_nearby(
        26.9124, 75.7873, compatible_donor_groups("O+"), radius_meters=5000, cooldown_days=90
    )
    compatible = set(compatible_donor_groups("O+"))
    assert all(d["blood_group"] in compatible for d in donors)
    assert all(d["distance_m"] <= 5000 for d in donors)


def test_full_flow_emergency_confirm_status():
    store = _store()

    resp = asyncio.run(
        emergency_service.trigger_emergency(
            store, lat=26.9124, lng=75.7873, emergency_type="trauma", blood_group="O+"
        )
    )
    assert resp["hospitals"] and "request_id" in resp
    request_id = resp["request_id"]

    # The emergency and its confirmations persisted to the fake DB.
    confs = store.confirmations_for_emergency(request_id)
    assert len(confs) == len(resp["hospitals"])

    # First hospital accepts.
    first = confs[0]
    out = confirm_service.handle_confirmation(store, first["token"], accepted=True)
    assert out["already_confirmed"] is False
    assert out["hospital_name"]

    # Status reflects the confirmation, read back from the DB.
    status = emergency_service.get_status(store, request_id)
    confirmed = [h for h in status["hospitals"] if h["status"] == "confirmed"]
    assert any(h["hospital_id"] == first["hospital_id"] for h in confirmed)

    # A second hospital accepting is told the patient is already routed.
    if len(confs) > 1:
        out2 = confirm_service.handle_confirmation(store, confs[1]["token"], accepted=True)
        assert out2["already_confirmed"] is True


def test_register_donor_persists():
    store = _store()
    before = len(store.tables["blood_donors"]) if hasattr(store, "tables") else None
    donor_id = store.add_donor("Test User", "+919800000000", "B+", 26.9, 75.8, None)
    assert donor_id.startswith("d")
    # Confirm it is queryable back.
    rows = store.client.tables["blood_donors"]
    assert any(r["id"] == donor_id for r in rows)
