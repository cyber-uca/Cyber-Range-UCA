"""
The challenge-type gateway.

Every challenge in the platform is graded through this one interface.
Right now there's a single type - standard flag matching - but the whole
point is that adding a new grading mechanic (multi-stage flags, team-based
scoring, partial credit) means writing one new class and registering it
here. `challenges.py` (the router) never changes.

This mirrors CTFd's own CHALLENGE_CLASSES registry, applied to this
platform.
"""
from abc import ABC, abstractmethod
from typing import Tuple


class ChallengeType(ABC):
    slug: str

    @abstractmethod
    def grade(self, challenge, submitted_value: str) -> Tuple[bool, int]:
        """Returns (is_correct, points_awarded_if_correct)."""
        ...


_type_registry = None


def _load_type_registry():
    from .challenge_types.standard_flag import StandardFlagChallengeType
    return {"standard_flag": StandardFlagChallengeType()}


def get_challenge_type(slug: str) -> ChallengeType:
    global _type_registry
    if _type_registry is None:
        _type_registry = _load_type_registry()
    handler = _type_registry.get(slug)
    if handler is None:
        raise ValueError(f"Unknown challenge_type '{slug}'. Registered: {list(_type_registry.keys())}")
    return handler


def list_registered_types():
    global _type_registry
    if _type_registry is None:
        _type_registry = _load_type_registry()
    return list(_type_registry.keys())
