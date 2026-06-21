"""Phone number normalisation.

Donor and hospital numbers arrive in mixed formats ("9876543210",
"+91 98765 43210", "098765 43210"). We normalise to E.164 (+91XXXXXXXXXX) so
they de-duplicate cleanly and are safe to hand to an SMS gateway.
"""

from __future__ import annotations

import re
from typing import Optional

_DIGITS = re.compile(r"\D")


def normalize_phone(raw: str, default_region: str = "IN") -> Optional[str]:
    """Return an E.164 string, or None if the input can't be a phone number.

    Uses the ``phonenumbers`` library when available; otherwise falls back to a
    pragmatic India-centric cleanup so the demo never hard-depends on the lib.
    """
    if not raw:
        return None

    try:
        import phonenumbers

        parsed = phonenumbers.parse(raw, default_region)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
        return None
    except Exception:
        return _fallback_normalize(raw)


def _fallback_normalize(raw: str) -> Optional[str]:
    digits = _DIGITS.sub("", raw)
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 10:  # bare Indian mobile
        return f"+91{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if 8 <= len(digits) <= 15:
        return f"+{digits}"
    return None
