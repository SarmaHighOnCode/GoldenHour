"""Keep the Render free-tier backend warm.

Render spins a free service down after ~15 min of inactivity; the next request
then pays a 30-60s cold start, which the browser sees as "Failed to fetch".
Run this anywhere with a stable connection (a laptop, a small VM, or a free
UptimeRobot monitor pointed at the same /health URL) to ping the API on an
interval shorter than the spin-down window so it never sleeps before a demo.

    python keep_alive.py

Override the target with the GOLDENHOUR_HEALTH_URL env var.
"""

import datetime
import os
import time
import urllib.request

URL = os.getenv(
    "GOLDENHOUR_HEALTH_URL", "https://goldenhour-api.onrender.com/health"
)
INTERVAL_SECONDS = 10 * 60  # 10 minutes — comfortably under Render's ~15 min idle
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "keep_alive.log")


def log(message: str) -> None:
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {message}"
    print(entry)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry + "\n")


def ping() -> None:
    start = time.monotonic()
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "GoldenHour-KeepAlive/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            elapsed = time.monotonic() - start
            log(f"OK  — {resp.status} ({elapsed:.2f}s)")
    except Exception as exc:  # noqa: BLE001
        log(f"ERR — {exc}")


def main() -> None:
    log(f"Keep-alive started. Pinging {URL} every {INTERVAL_SECONDS // 60} min.")
    while True:
        ping()
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
