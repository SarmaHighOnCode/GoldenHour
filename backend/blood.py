"""ABO/Rh blood-group compatibility.

For a patient who *needs* a given blood group, which donor groups can safely
donate? This is the hardcoded "ABO table" referenced in the backend PRD. It is
intentionally a plain dictionary — there is no clinical edge case here worth a
database lookup, and keeping it in code makes the donor query trivially fast.
"""

from __future__ import annotations

from typing import List

ALL_GROUPS: List[str] = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]

# Rh-negative groups are scarce in India (~5% of the population). Flag them so
# the UI can warn that compatible donors may be few and rare-group blood banks
# should be contacted in parallel.
RARE_GROUPS = frozenset({"O-", "A-", "B-", "AB-"})


def is_rare_group(recipient_group: str) -> bool:
    """True when the needed blood group is Rh-negative (scarce supply)."""
    return recipient_group in RARE_GROUPS


# recipient blood group -> list of donor groups that may donate to them
_COMPATIBLE_DONORS = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ALL_GROUPS,  # universal recipient
}


def compatible_donor_groups(recipient_group: str) -> List[str]:
    """Donor blood groups that can give to ``recipient_group``.

    Unknown groups return an empty list so callers fail safe (alert nobody)
    rather than alerting everybody.
    """
    return _COMPATIBLE_DONORS.get(recipient_group, [])
