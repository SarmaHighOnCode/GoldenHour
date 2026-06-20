"""A tiny in-process TTL cache.

Used to memoise expensive, repeatable lookups (e.g. Google Distance Matrix ETAs
between the same two points) for a few seconds during a burst of polling. Not a
distributed cache — it lives in the worker process and is fine for a single-node
demo deployment.
"""

from __future__ import annotations

import time
from typing import Any, Callable, Dict, Optional, Tuple


class TTLCache:
    def __init__(self, ttl_seconds: float = 30.0, max_entries: int = 512) -> None:
        self.ttl = ttl_seconds
        self.max_entries = max_entries
        self._data: Dict[Any, Tuple[float, Any]] = {}

    def get(self, key: Any) -> Optional[Any]:
        entry = self._data.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() > expires_at:
            self._data.pop(key, None)
            return None
        return value

    def set(self, key: Any, value: Any) -> None:
        if len(self._data) >= self.max_entries:
            self._evict_expired()
            if len(self._data) >= self.max_entries:
                self._data.pop(next(iter(self._data)))  # drop oldest-ish
        self._data[key] = (time.monotonic() + self.ttl, value)

    def get_or_set(self, key: Any, factory: Callable[[], Any]) -> Any:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = factory()
        self.set(key, value)
        return value

    def _evict_expired(self) -> None:
        now = time.monotonic()
        for key in [k for k, (exp, _) in self._data.items() if now > exp]:
            self._data.pop(key, None)

    def clear(self) -> None:
        self._data.clear()
