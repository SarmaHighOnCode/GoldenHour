"""Geospatial helpers.

In production the radius queries run inside PostGIS (``ST_DWithin`` /
``ST_Distance``). In demo mode we reproduce the same maths in Python with the
haversine formula so the app behaves identically without a database.
"""
from __future__ import annotations

import math

EARTH_RADIUS_M = 6_371_000.0


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two lat/lng points, in metres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    return haversine_meters(lat1, lng1, lat2, lng2) / 1000.0
