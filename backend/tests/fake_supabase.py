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


class _Query:
    def __init__(self, rows: List[Dict], op: str, payload=None):
        self._rows = rows           # the live backing list for this table
        self._op = op
        self._payload = payload
        self._filters = []          # list of (col, value)
        self._limit = None

    # builder methods (all return self) --------------------------------------
    def select(self, *_cols):
        self._op = "select"
        return self

    def eq(self, col, value):
        self._filters.append((col, value))
        return self

    def limit(self, n):
        self._limit = n
        return self

    def _matches(self, row) -> bool:
        return all(row.get(col) == value for col, value in self._filters)

    # terminal ---------------------------------------------------------------
    def execute(self) -> _Result:
        if self._op == "select":
            matched = [dict(r) for r in self._rows if self._matches(r)]
            if self._limit is not None:
                matched = matched[: self._limit]
            return _Result(matched)

        if self._op == "insert":
            items = self._payload if isinstance(self._payload, list) else [self._payload]
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
        if name != "donors_nearby":
            return _Query([], op="select")
        rows = self._donors_nearby(params)
        q = _Query(rows, op="select")
        return q

    def _donors_nearby(self, p: Dict) -> List[Dict]:
        today = date.today()
        groups = set(p["p_groups"])
        out = []
        for d in self.tables["blood_donors"]:
            if d["blood_group"] not in groups or not d.get("available", True):
                continue
            last = d.get("last_donated")
            if last:
                if (today - date.fromisoformat(last)).days < p["p_cooldown_days"]:
                    continue
            if haversine_meters(p["p_lat"], p["p_lng"], d["lat"], d["lng"]) > p["p_radius_m"]:
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
