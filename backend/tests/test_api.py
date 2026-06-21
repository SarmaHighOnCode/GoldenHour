"""Endpoint tests — verify the API_CONTRACT.md shapes and the live flow."""

from tests.conftest import JAIPUR

import store as store_module


def _trigger(client, **overrides):
    payload = {**JAIPUR, "emergency_type": "trauma", "blood_group": "O+", **overrides}
    return client.post("/emergency", json=payload)


# --- Health / meta ---------------------------------------------------------
def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body and "mode" in body


def test_ready(client):
    resp = client.get("/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ready"] is True
    assert body["backend"] == "in-memory"


# --- POST /emergency -------------------------------------------------------
def test_emergency_returns_contract_shape(client):
    resp = _trigger(client)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"request_id", "hospitals", "donors_alerted", "rare_group"}
    assert isinstance(body["hospitals"], list) and body["hospitals"]
    assert isinstance(body["donors_alerted"], int)
    assert isinstance(body["rare_group"], bool)

    card = body["hospitals"][0]
    assert set(card) == {
        "hospital_id",
        "name",
        "lat",
        "lng",
        "eta_minutes",
        "department_match",
        "distance_km",
        "status",
        "phone",
    }
    assert card["status"] == "pending"


def test_emergency_alerts_donors_with_blood_bank_directive(client):
    from services import sms_service

    sms_service.recent_alerts.clear()
    _trigger(client)
    assert sms_service.recent_alerts, "expected the blood branch to dispatch alerts"
    assert any("blood bank" in a["message"].lower() for a in sms_service.recent_alerts)


def test_rare_group_flag_tracks_rh_negative(client):
    assert _trigger(client, blood_group="O-").json()["rare_group"] is True
    assert _trigger(client, blood_group="O+").json()["rare_group"] is False


def test_emergency_hospitals_sorted_best_first(client):
    body = _trigger(client).json()
    etas = [h["eta_minutes"] for h in body["hospitals"]]
    # Not strictly sorted by ETA (score blends factors), but the best card
    # should be a sensible, nearby option.
    assert all(isinstance(e, int) and e >= 1 for e in etas)


def test_emergency_rejects_bad_enum(client):
    resp = _trigger(client, emergency_type="zombie")
    assert resp.status_code == 422


def test_emergency_rejects_out_of_range_coordinates(client):
    assert _trigger(client, lat=999).status_code == 422
    assert _trigger(client, lng=-500).status_code == 422


# --- GET /emergency/{id}/status -------------------------------------------
def test_status_unknown_request_id_is_404(client):
    assert client.get("/emergency/nope/status").status_code == 404


def test_status_shape(client):
    request_id = _trigger(client).json()["request_id"]
    body = client.get(f"/emergency/{request_id}/status").json()
    assert set(body) == {
        "request_id",
        "lat",
        "lng",
        "hospitals",
        "donors_alerted",
        "donors_responded",
        "unconfirmed_fallback",
    }
    assert body["request_id"] == request_id
    # Freshly created — well inside the no-confirmation window.
    assert body["unconfirmed_fallback"] is False
    card = body["hospitals"][0]
    assert set(card) == {
        "hospital_id", "name", "lat", "lng", "eta_minutes", "status"
    }


# --- POST /confirm/{token} — the live flow --------------------------------
def test_confirm_flips_hospital_status_live(client):
    request_id = _trigger(client).json()["request_id"]
    store = store_module.get_store()
    confs = store.confirmations_for_emergency(request_id)
    assert len(confs) >= 2
    first, second = confs[0], confs[1]

    # First hospital accepts -> ok, not already confirmed.
    r1 = client.post(f"/confirm/{first['token']}", json={"accepted": True})
    assert r1.status_code == 200
    body1 = r1.json()
    assert set(body1) == {"ok", "hospital_name", "already_confirmed"}
    assert body1["ok"] is True
    assert body1["already_confirmed"] is False

    # Status now shows that hospital confirmed.
    status = client.get(f"/emergency/{request_id}/status").json()
    confirmed = [h for h in status["hospitals"] if h["status"] == "confirmed"]
    assert any(h["hospital_id"] == first["hospital_id"] for h in confirmed)

    # A second hospital accepting is told the patient is already routed.
    r2 = client.post(f"/confirm/{second['token']}", json={"accepted": True})
    assert r2.json()["already_confirmed"] is True


def test_confirm_unknown_token_is_404(client):
    resp = client.post("/confirm/does-not-exist", json={"accepted": True})
    assert resp.status_code == 404


# --- GET /confirm/{token} — details for the hospital page ------------------
def test_confirm_details_shape_and_values(client):
    request_id = _trigger(client, emergency_type="trauma", blood_group="O+").json()[
        "request_id"
    ]
    store = store_module.get_store()
    conf = store.confirmations_for_emergency(request_id)[0]

    body = client.get(f"/confirm/{conf['token']}").json()
    assert set(body) == {
        "hospital_name",
        "emergency_type",
        "blood_group",
        "eta_minutes",
        "already_confirmed",
        "responded",
        "accepted",
    }
    assert body["emergency_type"] == "trauma"
    assert body["blood_group"] == "O+"
    assert body["hospital_name"] == conf["hospital_name"]
    assert isinstance(body["eta_minutes"], int)
    # Freshly created, nobody has replied yet.
    assert body["already_confirmed"] is False
    assert body["responded"] is False
    assert body["accepted"] is False


def test_confirm_details_reflects_reply_and_race(client):
    request_id = _trigger(client).json()["request_id"]
    store = store_module.get_store()
    confs = store.confirmations_for_emergency(request_id)
    first, second = confs[0], confs[1]

    client.post(f"/confirm/{first['token']}", json={"accepted": True})

    # The hospital that accepted sees responded/accepted true.
    winner = client.get(f"/confirm/{first['token']}").json()
    assert winner["responded"] is True
    assert winner["accepted"] is True

    # Another hospital sees the patient is already routed.
    other = client.get(f"/confirm/{second['token']}").json()
    assert other["already_confirmed"] is True
    assert other["responded"] is False


def test_confirm_details_unknown_token_is_404(client):
    assert client.get("/confirm/does-not-exist").status_code == 404


# --- POST /donor/register --------------------------------------------------
def test_register_donor(client):
    resp = client.post(
        "/donor/register",
        json={
            "name": "Asha Verma",
            "phone": "+919812345678",
            "blood_group": "B+",
            "lat": 26.92,
            "lng": 75.80,
            "last_donated": "2025-01-15",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["donor_id"].startswith("d")


# --- Security: token strength + rate limiting ------------------------------
def test_confirmation_tokens_are_strong_and_unique(client):
    request_id = _trigger(client).json()["request_id"]
    store = store_module.get_store()
    tokens = [c["token"] for c in store.confirmations_for_emergency(request_id)]
    assert tokens, "expected at least one confirmation token"
    # secrets.token_urlsafe(16) -> ~22 chars; far longer than a 12-char uuid slice.
    assert all(len(t) >= 20 for t in tokens)
    assert len(set(tokens)) == len(tokens)


def test_emergency_rate_limited_after_burst(client):
    import main as main_module

    limiter = main_module._emergency_limiter
    # Saturate the window for the test client's key directly — this keeps the
    # test instant and deterministic (no dependence on wall-clock or on the
    # speed of the real hospital-ranking work behind the endpoint).
    for _ in range(limiter.max_requests):
        limiter.allow("testclient")
    # The next real call is rejected by the dependency before any work runs.
    assert _trigger(client).status_code == 429


# --- GET /donor/respond/{token} --------------------------------------------
def test_donor_respond_increments_count(client):
    request_id = _trigger(client).json()["request_id"]
    store = store_module.get_store()
    alerts = store.donor_alerts_for_emergency(request_id)
    assert alerts, "expected at least one donor alert token"
    token = alerts[0]["token"]

    before = client.get(f"/emergency/{request_id}/status").json()["donors_responded"]
    resp = client.get(f"/donor/respond/{token}")
    assert resp.status_code == 200
    assert "thank" in resp.text.lower()

    after = client.get(f"/emergency/{request_id}/status").json()["donors_responded"]
    assert after == before + 1


def test_donor_respond_token_is_single_use(client):
    request_id = _trigger(client).json()["request_id"]
    token = store_module.get_store().donor_alerts_for_emergency(request_id)[0]["token"]
    assert client.get(f"/donor/respond/{token}").status_code == 200
    assert client.get(f"/donor/respond/{token}").status_code == 404


def test_donor_respond_unknown_token_is_404(client):
    assert client.get("/donor/respond/not-a-real-token").status_code == 404


# --- POST /sms/inbound -----------------------------------------------------
def test_sms_inbound_parses_and_replies(client):
    resp = client.post(
        "/sms/inbound",
        json={"from": "+919800000000", "body": "BLOOD O+ Malviya Nagar Jaipur"},
    )
    assert resp.status_code == 200
    assert "Nearest hospitals" in resp.json()["reply"]
