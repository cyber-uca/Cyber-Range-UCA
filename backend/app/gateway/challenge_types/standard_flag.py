import hashlib
from typing import Tuple

from ..challenge_type_gateway import ChallengeType


def hash_flag(value: str) -> str:
    return hashlib.sha256(value.strip().encode()).hexdigest()


class StandardFlagChallengeType(ChallengeType):
    """The default and only built-in type: submit a string, hash it, compare."""
    slug = "standard_flag"

    def grade(self, challenge, submitted_value: str) -> Tuple[bool, int]:
        is_correct = hash_flag(submitted_value) == challenge.flag_hash
        return is_correct, (challenge.points if is_correct else 0)
