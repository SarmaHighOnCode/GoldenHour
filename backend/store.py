"""Data layer.

Two interchangeable stores implement the same method surface:

* ``InMemoryStore`` — seeded with Jaipur hospitals + donors, haversine radius
  queries. The default; runs with zero external services (demo mode, CI).
* ``SupabaseStore`` — PostgreSQL + PostGIS via Supabase. Used automatically when
  ``SUPABASE_URL`` / ``SUPABASE_ANON_KEY`` are set; falls back to in-memory if the
  client can't be created, so the API never hard-fails at boot.

``get_store()`` picks the right one. Because the four logical tables
(``hospitals``, ``blood_donors``, ``emergency_requests``,
``confirmation_requests``) and every query method are identical across both,
the service layer is completely unaware of which store is live.
"""

from __future__ import annotations

import itertools
import logging
import uuid
from datetime import date, datetime, timezone
from typing import Dict, List, Optional

import seed_data
from config import settings
from geo import haversine_km, haversine_meters

logger = logging.getLogger("goldenhour.store")


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value) -> datetime:
    """Coerce a Supabase timestamptz string (or datetime) to an aware datetime."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            pass
    return _now()


def _nearest_blood_bank(
    banks: List[Dict], lat: float, lng: float, max_km: float
) -> Optional[Dict]:
    """Nearest licensed blood bank within ``max_km``, or None.

    The distance guard stops a seeded city's banks from leaking to a far-away
    location (e.g. a Guwahati patient must not be routed to a Jaipur bank); when
    nothing is in range the caller falls back to generic "nearest licensed bank"
    guidance.
    """
    nearest: Optional[Dict] = None
    best_km = max_km
    for b in banks:
        d = haversine_km(lat, lng, b["lat"], b["lng"])
        if d <= best_km:
            best_km = d
            nearest = {**b, "distance_km": round(d, 2)}
    return nearest


# ===========================================================================
# In-memory store (demo / CI)
# ===========================================================================
class InMemoryStore:
    backend = "in-memory"

    def __init__(self) -> None:
        self.hospitals: List[Dict] = seed_data.hospitals()
        self.blood_banks: List[Dict] = seed_data.blood_banks()
        self.donors: List[Dict] = seed_data.donors()
        self.emergencies: Dict[str, Dict] = {}
        self.confirmations: Dict[str, Dict] = {}  # keyed by token
        self.donor_tokens: Dict[str, Dict] = {}  # keyed by token
        self._emergency_seq = itertools.count(1)
        self._donor_seq = itertools.count(len(self.donors) + 1)
        # OSM lazy-fetch cache: grid cells already fetched (0.3° ≈ 33 km)
        self._osm_regions: set = set()
        # Demo-donor cache: grid cells already given a synthesized donor pool.
        self._donor_regions: set = set()

    def _region_key(self, lat: float, lng: float) -> tuple:
        return (round(lat / 0.3), round(lng / 0.3))

    def is_region_fetched(self, lat: float, lng: float) -> bool:
        return self._region_key(lat, lng) in self._osm_regions

    def mark_region_fetched(self, lat: float, lng: float) -> None:
        self._osm_regions.add(self._region_key(lat, lng))

    def bulk_add_hospitals(self, hospitals: List[Dict]) -> int:
        existing = {h["id"] for h in self.hospitals}
        added = 0
        for h in hospitals:
            if h["id"] not in existing:
                self.hospitals.append(h)
                existing.add(h["id"])
                added += 1
        logger.info(
            "OSM: added %d new hospitals (store total %d)", added, len(self.hospitals)
        )
        return added

    def is_donor_region_seeded(self, lat: float, lng: float) -> bool:
        return self._region_key(lat, lng) in self._donor_regions

    def mark_donor_region_seeded(self, lat: float, lng: float) -> None:
        self._donor_regions.add(self._region_key(lat, lng))

    def bulk_add_donors(self, donors: List[Dict]) -> int:
        existing = {d["id"] for d in self.donors}
        added = 0
        for d in donors:
            if d["id"] not in existing:
                self.donors.append(d)
                existing.add(d["id"])
                added += 1
        logger.info(
            "Donors: added %d demo donors near venue (store total %d)",
            added,
            len(self.donors),
        )
        return added

    # --- Hospitals ---------------------------------------------------------
    def hospitals_with_distance(self, lat: float, lng: float) -> List[Dict]:
        out = []
        for h in self.hospitals:
            enriched = dict(h)
            enriched["distance_km"] = round(
                haversine_km(lat, lng, h["lat"], h["lng"]), 2
            )
            out.append(enriched)
        return out

    # --- Blood banks -------------------------------------------------------
    def nearest_blood_bank(
        self, lat: float, lng: float, max_km: float = 60.0
    ) -> Optional[Dict]:
        return _nearest_blood_bank(self.blood_banks, lat, lng, max_km)

    # --- Donors ------------------------------------------------------------
    def compatible_donors_nearby(
        self,
        lat: float,
        lng: float,
        compatible_groups: List[str],
        radius_meters: float,
        cooldown_days: int,
        cooldown_days_female: Optional[int] = None,
        today: Optional[date] = None,
    ) -> List[Dict]:
        today = today or date.today()
        groups = set(compatible_groups)
        result: List[Dict] = []
        for d in self.donors:
            if d["blood_group"] not in groups:
                continue
            if not d.get("available", True):
                continue
            last = _parse_date(d.get("last_donated"))
            cooldown = cooldown_days
            if cooldown_days_female is not None and d.get("sex") == "female":
                cooldown = cooldown_days_female
            if last is not None and (today - last).days < cooldown:
                continue
            dist = haversine_meters(lat, lng, d["lat"], d["lng"])
            if dist > radius_meters:
                continue
            enriched = dict(d)
            enriched["distance_m"] = round(dist, 1)
            result.append(enriched)
        result.sort(key=lambda d: d["distance_m"])
        return result

    def add_donor(
        self, name, phone, blood_group, lat, lng, last_donated, sex=None
    ) -> str:
        donor_id = f"d{next(self._donor_seq)}"
        self.donors.append(
            {
                "id": donor_id,
                "name": name,
                "phone": phone,
                "blood_group": blood_group,
                "lat": lat,
                "lng": lng,
                "last_donated": last_donated,
                "sex": sex,
                "available": True,
            }
        )
        return donor_id

    # --- Emergencies -------------------------------------------------------
    def create_emergency(
        self, lat, lng, emergency_type, blood_group, hospital_cards, donors_alerted
    ) -> Dict:
        request_id = f"req{next(self._emergency_seq):04d}"
        record = {
            "id": request_id,
            "lat": lat,
            "lng": lng,
            "emergency_type": emergency_type,
            "blood_group": blood_group,
            "status": "pending",
            "created_at": _now(),
            "hospitals": hospital_cards,
            "donors_alerted": donors_alerted,
            "donors_responded": 0,
        }
        self.emergencies[request_id] = record
        return record

    def get_emergency(self, request_id: str) -> Optional[Dict]:
        return self.emergencies.get(request_id)

    # --- Confirmation requests --------------------------------------------
    def create_confirmation(
        self, emergency_id, hospital_id, hospital_name, token
    ) -> Dict:
        record = {
            "token": token,
            "emergency_id": emergency_id,
            "hospital_id": hospital_id,
            "hospital_name": hospital_name,
            "sent_at": _now(),
            "replied_at": None,
            "confirmed": None,
        }
        self.confirmations[token] = record
        return record

    def get_confirmation(self, token: str) -> Optional[Dict]:
        return self.confirmations.get(token)

    def confirmations_for_emergency(self, emergency_id: str) -> List[Dict]:
        return [
            c for c in self.confirmations.values() if c["emergency_id"] == emergency_id
        ]

    def emergency_is_taken(self, emergency_id: str) -> bool:
        return any(
            c["confirmed"] is True
            for c in self.confirmations_for_emergency(emergency_id)
        )

    def hospital_reliability(self, hospital_id: str) -> tuple[int, float]:
        """(#replied confirmations, acceptance rate) for a hospital, all-time.

        Powers the cold-start gate in ranking: reliability is trusted only once
        enough confirmations have actually been logged for this hospital.
        """
        replied = [
            c
            for c in self.confirmations.values()
            if c["hospital_id"] == hospital_id and c["confirmed"] is not None
        ]
        if not replied:
            return 0, 0.0
        accepted = sum(1 for c in replied if c["confirmed"] is True)
        return len(replied), accepted / len(replied)

    def record_reply(self, token: str, accepted: bool) -> bool:
        """Persist a hospital's Accept/Decline.

        Returns True if the reply was recorded, False if it was blocked:
        - token unknown
        - already replied
        - accepted=True but another hospital already won (atomic first-accept)

        In a single-process asyncio context the check-and-set is already
        non-interruptible (no await between read and write), so no lock is
        needed here — the return value is what callers use to detect the race.
        """
        conf = self.confirmations.get(token)
        if conf is None:
            return False
        if conf["confirmed"] is not None:
            # Already replied (idempotent replay protection).
            return False
        if accepted and self.emergency_is_taken(conf["emergency_id"]):
            # Another hospital won the race — do not overwrite.
            return False
        conf["confirmed"] = accepted
        conf["replied_at"] = _now()
        emergency = self.emergencies.get(conf["emergency_id"])
        if emergency is not None:
            status = "confirmed" if accepted else "declined"
            for card in emergency["hospitals"]:
                if card["hospital_id"] == conf["hospital_id"]:
                    card["status"] = status
            if accepted:
                emergency["status"] = "confirmed"
        return True

    # --- Donor alert tokens -----------------------------------------------
    def create_donor_alert_token(
        self, emergency_id: str, donor_phone: str, token: str
    ) -> None:
        self.donor_tokens[token] = {
            "emergency_id": emergency_id,
            "donor_phone": donor_phone,
            "responded": False,
        }

    def record_donor_response(self, token: str) -> bool:
        """Mark a donor as responded. Returns False if unknown or already used."""
        rec = self.donor_tokens.get(token)
        if rec is None or rec["responded"]:
            return False
        rec["responded"] = True
        emergency = self.emergencies.get(rec["emergency_id"])
        if emergency is not None:
            emergency["donors_responded"] = emergency.get("donors_responded", 0) + 1
        return True

    def donor_alerts_for_emergency(self, emergency_id: str) -> List[Dict]:
        return [
            {"token": t, **v}
            for t, v in self.donor_tokens.items()
            if v["emergency_id"] == emergency_id
        ]

    def ping(self) -> bool:
        """Readiness check — the in-memory store is always ready."""
        return True


# ===========================================================================
# Supabase store (production)
# ===========================================================================
class SupabaseStore:
    backend = "supabase"

    def __init__(self, client) -> None:
        self.client = client
        self._hospitals_cache: Optional[List[Dict]] = None
        self._banks_cache: Optional[List[Dict]] = None
        self.donor_tokens: Dict[str, Dict] = {}  # in-process; no DB table needed
        # In-process region cache so on-demand OSM fetching works the same as
        # InMemoryStore. Cleared on restart, which is fine — the OSM fetch fires
        # once per region per process lifetime, then new hospitals are cached here.
        self._osm_regions: set = set()

    def _region_key(self, lat: float, lng: float) -> tuple:
        return (round(lat / 0.3), round(lng / 0.3))

    def is_region_fetched(self, lat: float, lng: float) -> bool:
        return self._region_key(lat, lng) in self._osm_regions

    def mark_region_fetched(self, lat: float, lng: float) -> None:
        self._osm_regions.add(self._region_key(lat, lng))

    def bulk_add_hospitals(self, hospitals: List[Dict]) -> int:
        """Upsert OSM-fetched hospitals into Supabase and warm the in-process cache."""
        if self._hospitals_cache is None:
            _ = self.hospitals  # warm the cache from DB first
        existing = {h["id"] for h in self._hospitals_cache}
        new_hospitals = [h for h in hospitals if h["id"] not in existing]
        if new_hospitals:
            db_cols = [
                "id",
                "name",
                "lat",
                "lng",
                "departments",
                "phone",
                "contact_phone",
            ]
            rows = [{k: h[k] for k in db_cols if k in h} for h in new_hospitals]
            self.client.table("hospitals").upsert(rows).execute()
            for h in new_hospitals:
                self._hospitals_cache.append(h)
                existing.add(h["id"])
        added = len(new_hospitals)
        logger.info(
            "OSM: upserted %d new hospitals to Supabase (total %d)",
            added,
            len(self._hospitals_cache),
        )
        return added

    # --- Hospitals ---------------------------------------------------------
    @property
    def hospitals(self) -> List[Dict]:
        if self._hospitals_cache is None:
            res = self.client.table("hospitals").select("*").execute()
            self._hospitals_cache = res.data or []
        return self._hospitals_cache

    def hospitals_with_distance(self, lat: float, lng: float) -> List[Dict]:
        out = []
        for h in self.hospitals:
            enriched = dict(h)
            enriched["distance_km"] = round(
                haversine_km(lat, lng, h["lat"], h["lng"]), 2
            )
            out.append(enriched)
        return out

    # --- Blood banks -------------------------------------------------------
    @property
    def blood_banks(self) -> List[Dict]:
        if self._banks_cache is None:
            res = self.client.table("blood_banks").select("*").execute()
            self._banks_cache = res.data or []
        return self._banks_cache

    def nearest_blood_bank(
        self, lat: float, lng: float, max_km: float = 60.0
    ) -> Optional[Dict]:
        return _nearest_blood_bank(self.blood_banks, lat, lng, max_km)

    # --- Donors (PostGIS radius via RPC) -----------------------------------
    def compatible_donors_nearby(
        self,
        lat: float,
        lng: float,
        compatible_groups: List[str],
        radius_meters: float,
        cooldown_days: int,
        cooldown_days_female: Optional[int] = None,
        today: Optional[date] = None,
    ) -> List[Dict]:
        res = self.client.rpc(
            "donors_nearby",
            {
                "p_lat": lat,
                "p_lng": lng,
                "p_groups": compatible_groups,
                "p_radius_m": radius_meters,
                "p_cooldown_days": cooldown_days,
                "p_cooldown_days_female": (
                    cooldown_days_female
                    if cooldown_days_female is not None
                    else cooldown_days
                ),
            },
        ).execute()
        donors = res.data or []
        for d in donors:
            d["distance_m"] = round(haversine_meters(lat, lng, d["lat"], d["lng"]), 1)
        return donors

    def add_donor(
        self, name, phone, blood_group, lat, lng, last_donated, sex=None
    ) -> str:
        donor_id = f"d{uuid.uuid4().hex[:8]}"
        self.client.table("blood_donors").insert(
            {
                "id": donor_id,
                "name": name,
                "phone": phone,
                "blood_group": blood_group,
                "lat": lat,
                "lng": lng,
                "last_donated": last_donated,
                "sex": sex,
                "available": True,
            }
        ).execute()
        return donor_id

    # --- Emergencies -------------------------------------------------------
    def create_emergency(
        self, lat, lng, emergency_type, blood_group, hospital_cards, donors_alerted
    ) -> Dict:
        request_id = f"req{uuid.uuid4().hex[:8]}"
        created_at = _now()
        self.client.table("emergency_requests").insert(
            {
                "id": request_id,
                "emergency_type": emergency_type,
                "blood_group_needed": blood_group,
                "lat": lat,
                "lng": lng,
                "status": "pending",
                "donors_alerted": donors_alerted,
                "donors_responded": 0,
                "hospitals": hospital_cards,
            }
        ).execute()
        return {
            "id": request_id,
            "lat": lat,
            "lng": lng,
            "emergency_type": emergency_type,
            "blood_group": blood_group,
            "status": "pending",
            "created_at": created_at,
            "hospitals": hospital_cards,
            "donors_alerted": donors_alerted,
            "donors_responded": 0,
        }

    def get_emergency(self, request_id: str) -> Optional[Dict]:
        res = (
            self.client.table("emergency_requests")
            .select("*")
            .eq("id", request_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return None
        row = res.data[0]
        return {
            "id": row["id"],
            "lat": row["lat"],
            "lng": row["lng"],
            "emergency_type": row["emergency_type"],
            "blood_group": row["blood_group_needed"],
            "status": row["status"],
            "created_at": _parse_dt(row.get("created_at")),
            "hospitals": row.get("hospitals") or [],
            "donors_alerted": row.get("donors_alerted", 0),
            "donors_responded": row.get("donors_responded", 0),
        }

    # --- Confirmation requests --------------------------------------------
    def create_confirmation(
        self, emergency_id, hospital_id, hospital_name, token
    ) -> Dict:
        record = {
            "token": token,
            "emergency_id": emergency_id,
            "hospital_id": hospital_id,
            "hospital_name": hospital_name,
            "confirmed": None,
        }
        self.client.table("confirmation_requests").insert(record).execute()
        record["sent_at"] = _now()
        record["replied_at"] = None
        return record

    def get_confirmation(self, token: str) -> Optional[Dict]:
        res = (
            self.client.table("confirmation_requests")
            .select("*")
            .eq("token", token)
            .limit(1)
            .execute()
        )
        if not res.data:
            return None
        row = res.data[0]
        return {
            "token": row["token"],
            "emergency_id": row["emergency_id"],
            "hospital_id": row["hospital_id"],
            "hospital_name": row.get("hospital_name", ""),
            "sent_at": _parse_dt(row.get("sent_at")),
            "replied_at": row.get("replied_at"),
            "confirmed": row.get("confirmed"),
        }

    def confirmations_for_emergency(self, emergency_id: str) -> List[Dict]:
        res = (
            self.client.table("confirmation_requests")
            .select("*")
            .eq("emergency_id", emergency_id)
            .execute()
        )
        return res.data or []

    def emergency_is_taken(self, emergency_id: str) -> bool:
        res = (
            self.client.table("confirmation_requests")
            .select("token")
            .eq("emergency_id", emergency_id)
            .eq("confirmed", True)
            .limit(1)
            .execute()
        )
        return bool(res.data)

    def hospital_reliability(self, hospital_id: str) -> tuple[int, float]:
        """(#replied confirmations, acceptance rate) for a hospital, all-time."""
        res = (
            self.client.table("confirmation_requests")
            .select("confirmed")
            .eq("hospital_id", hospital_id)
            .execute()
        )
        replied = [r for r in (res.data or []) if r.get("confirmed") is not None]
        if not replied:
            return 0, 0.0
        accepted = sum(1 for r in replied if r["confirmed"] is True)
        return len(replied), accepted / len(replied)

    def record_reply(self, token: str, accepted: bool) -> bool:
        """Persist a hospital's Accept/Decline atomically.

        For ACCEPT: delegates to the ``claim_emergency`` Postgres function which
        performs a single UPDATE … WHERE NOT EXISTS (another accepted row). Only
        one concurrent accept can match rows — the loser gets rows_updated=0 and
        this method returns False so the caller knows the race was lost.

        For DECLINE: a plain conditional UPDATE (only if not yet replied).

        Returns True if the reply was written, False if blocked.
        """
        conf = self.get_confirmation(token)
        if conf is None:
            return False

        if accepted:
            # Single atomic statement — cannot double-confirm.
            res = self.client.rpc(
                "claim_emergency",
                {"p_token": token, "p_emergency_id": conf["emergency_id"]},
            ).execute()
            won = bool(res.data)
            if not won:
                return False
        else:
            res = (
                self.client.table("confirmation_requests")
                .update({"confirmed": False, "replied_at": _now().isoformat()})
                .eq("token", token)
                .is_("confirmed", None)  # idempotent: skip if already replied
                .execute()
            )
            if not res.data:
                return False

        emergency = self.get_emergency(conf["emergency_id"])
        if emergency is None:
            return True
        status = "confirmed" if accepted else "declined"
        cards = emergency["hospitals"]
        for card in cards:
            if card["hospital_id"] == conf["hospital_id"]:
                card["status"] = status
        update = {"hospitals": cards}
        if accepted:
            update["status"] = "confirmed"
        self.client.table("emergency_requests").update(update).eq(
            "id", conf["emergency_id"]
        ).execute()
        return True

    # --- Donor alert tokens -----------------------------------------------
    def create_donor_alert_token(
        self, emergency_id: str, donor_phone: str, token: str
    ) -> None:
        self.donor_tokens[token] = {
            "emergency_id": emergency_id,
            "donor_phone": donor_phone,
            "responded": False,
        }

    def record_donor_response(self, token: str) -> bool:
        """Mark a donor as responded and increment the DB counter."""
        rec = self.donor_tokens.get(token)
        if rec is None or rec["responded"]:
            return False
        rec["responded"] = True
        emergency = self.get_emergency(rec["emergency_id"])
        if emergency is not None:
            new_count = emergency["donors_responded"] + 1
            self.client.table("emergency_requests").update(
                {"donors_responded": new_count}
            ).eq("id", rec["emergency_id"]).execute()
        return True

    def donor_alerts_for_emergency(self, emergency_id: str) -> List[Dict]:
        return [
            {"token": t, **v}
            for t, v in self.donor_tokens.items()
            if v["emergency_id"] == emergency_id
        ]

    def ping(self) -> bool:
        """Readiness check — confirm the database answers a trivial query."""
        try:
            self.client.table("hospitals").select("id").limit(1).execute()
            return True
        except Exception:
            logger.exception("Supabase ping failed")
            return False


# ===========================================================================
# Store selection
# ===========================================================================
_store = None


def get_store():
    """Process-wide singleton store, chosen from configuration.

    Supabase when configured and reachable; in-memory otherwise. A Supabase
    init failure logs and falls back to in-memory rather than breaking boot.
    """
    global _store
    if _store is not None:
        return _store

    if settings.use_supabase:
        try:
            from supabase import create_client

            client = create_client(settings.supabase_url, settings.supabase_active_key)
            _store = SupabaseStore(client)
            key_kind = "service-role" if settings.supabase_service_key else "anon"
            logger.info("Data layer: Supabase (PostGIS), %s key", key_kind)
        except Exception:
            logger.exception("Supabase init failed — falling back to in-memory store")
            _store = InMemoryStore()
    else:
        _store = InMemoryStore()
    return _store
