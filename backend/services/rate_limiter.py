"""A small fixed-window rate limiter.

Guards the write endpoints (notably ``POST /emergency`` and
``POST /donor/register``) against accidental floods — a panicked user
double-tapping, or a runaway client. In-process and per-key; for a single-node
demo that is sufficient. A multi-node deployment would back this with Redis.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict


class RateLimiter:
    def __init__(self, max_requests: int = 20, window_seconds: float = 60.0) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        """Record a hit for ``key`` and return whether it is within the limit."""
        now = time.monotonic()
        window_start = now - self.window
        hits = self._hits[key]
        while hits and hits[0] < window_start:
            hits.popleft()
        if len(hits) >= self.max_requests:
            return False
        hits.append(now)
        return True

    def reset(self, key: str | None = None) -> None:
        if key is None:
            self._hits.clear()
        else:
            self._hits.pop(key, None)
