"""Service layer: business logic for GoldenHour.

Each module owns one concern (hospital ranking, donor matching, confirmation
flow, geocoding/ETA, messaging, realtime, plus small infra helpers). Route
handlers in ``main.py`` call into these; data access goes through ``store.py``.
"""
