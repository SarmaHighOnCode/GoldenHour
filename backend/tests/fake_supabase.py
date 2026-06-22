"""A minimal in-process fake of the supabase-py client.

Implements just the query-builder surface that ``SupabaseStore`` uses
(``table().select().eq().limit().execute()``, ``insert``, ``update``, and
``rpc``) backed by plain lists. Lets us exercise the production store's logic —
column names, query chains, key mapping — without a live database.
"""

from __future__ import annotations

from datetime import date
from typing import Dict, List

import seed_data
from geo import haversine_meters


class _Result:
    def __init__(self, data):
        self.data = data


class _BoolResult:
    """Wraps a boolean so .execute() returns _Result(bool) matching supabase-py RPC."""

    def __init__(self, value: bool):
        self._value = value

    def execute(self) -> _Result:
        return _Result(self._value)


class _Query:
    def __init__(self, rows: List[Dict], op: str, payload=None):
        self._rows = rows  # the live backing list for this table
        self._op = op
        self._payload = payload
        self._filters = []  # list of (col, value)
        self._limit = None

    # builder methods (all return self) --------------------------------------
    def select(self, *_cols):
        self._op = "select"
        return self

    def eq(self, col, value):
        self._filters.append(("eq", col, value))
        return self

    def is_(self, col, value):
        """Filter: row[col] IS value (None maps to SQL NULL check)."""
        self._filters.append(("is", col, value))
        return self

    def limit(self, n):
        self._limit = n
        return self

    def _matches(self, row) -> bool:
        for f in self._filters:
            op, col, value = f
            if op == "eq":
                if row.get(col) != value:
                    return False
            elif op == "is":
                # None means "IS NULL" in the Supabase client API.
                if value is None:
                    if row.get(col) is not None:
                        return False
                else:
                    if row.get(col) != value:
                        return False
        return True

    # terminal ---------------------------------------------------------------
    def execute(self) -> _Result:
        if self._op == "select":
            matched = [dict(r) for r in self._rows if self._matches(r)]
            if self._limit is not None:
                matched = matched[: self._limit]
            return _Result(matched)

        if self._op == "insert":
            items = (
                self._payload if isinstance(self._payload, list) else [self._payload]
            )
            for item in items:
                self._rows.append(dict(item))
            return _Result([dict(i) for i in items])

        if self._op == "update":
            updated = []
            for row in self._rows:
                if self._matches(row):
                    row.update(self._payload)
                    updated.append(dict(row))
            return _Result(updated)

        return _Result([])


class FakeSupabaseClient:
    def __init__(self):
        self.tables: Dict[str, List[Dict]] = {
            "hospitals": [dict(h) for h in seed_data.hospitals()],
            "blood_banks": [dict(b) for b in seed_data.blood_banks()],
            "blood_donors": [dict(d) for d in seed_data.donors()],
            "emergency_requests": [],
            "confirmation_requests": [],
        }

    def table(self, name: str) -> _Query:
        return _Query(self.tables.setdefault(name, []), op="select")

    # supabase: client.table(name).insert(...) / .update(...)
    # The builder above starts in "select"; insert/update switch the op.
    def _wrap_insert_update(self):  # pragma: no cover - documentation only
        ...

    def rpc(self, name: str, params: Dict) -> _Query:
        if name == "donors_nearby":
            rows = self._donors_nearby(params)
            return _Query(rows, op="select")
        if name == "claim_emergency":
            result = self._claim_emergency(params)
            # Return a _Query whose execute() yields the bool directly.
            return _BoolResult(result)
        return _Query([], op="select")

    def _claim_emergency(self, p: Dict) -> bool:
        """Atomic first-accept: mirrors the Postgres claim_emergency function."""
        token = p["p_token"]
        emergency_id = p["p_emergency_id"]
        confs = self.tables["confirmation_requests"]
        # Check: is the patient already taken?
        already_taken = any(
            c["emergency_id"] == emergency_id and c.get("confirmed") is True
            for c in confs
        )
        if already_taken:
            return False
        # Find and update the row for this token (only if still pending).
        from datetime import timezone
        import datetime

        now_iso = datetime.datetime.now(timezone.utc).isoformat()
        for c in confs:
            if c["token"] == token and c.get("confirmed") is None:
                c["confirmed"] = True
                c["replied_at"] = now_iso
                return True
        return False

    def _donors_nearby(self, p: Dict) -> List[Dict]:
        today = date.today()
        groups = set(p["p_groups"])
        cd_male = p.get("p_cooldown_days", 90)
        cd_female = p.get("p_cooldown_days_female", cd_male)
        out = []
        for d in self.tables["blood_donors"]:
            if d["blood_group"] not in groups or not d.get("available", True):
                continue
            last = d.get("last_donated")
            if last:
                cooldown = cd_female if d.get("sex") == "female" else cd_male
                if (today - date.fromisoformat(last)).days < cooldown:
                    continue
            if (
                haversine_meters(p["p_lat"], p["p_lng"], d["lat"], d["lng"])
                > p["p_radius_m"]
            ):
                continue
            out.append(dict(d))
        return out


# supabase-py exposes insert()/update() on the table builder; add them here so
# `client.table(x).insert(...)` works with our _Query starting state.
def _insert(self, payload):
    self._op = "insert"
    self._payload = payload
    return self


def _update(self, payload):
    self._op = "update"
    self._payload = payload
    return self


_Query.insert = _insert
_Query.update = _update
