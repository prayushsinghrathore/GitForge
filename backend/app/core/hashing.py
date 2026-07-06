"""Content addressing for GitForge.

Every object stored by the engine is identified by the SHA-256 of its
*canonical serialized bytes*. This is the same idea Git uses (Git uses SHA-1
by default), and it gives us two guarantees for free:

1. Deduplication: identical content is stored exactly once.
2. Integrity: an object's id is a checksum of its content, so corruption or
   tampering is detectable simply by re-hashing.

The engine never depends on Git; this module implements the addressing scheme
from scratch.
"""

from __future__ import annotations

import hashlib

# Object ids are lowercase hex SHA-256 digests (64 chars). Git uses a
# "<type> <size>\0<content>" header before hashing so that, e.g., an empty
# blob and an empty tree get different ids. We follow the same convention.
_HEADER_SEP = b"\x00"


def hash_bytes(obj_type: str, payload: bytes) -> str:
    """Return the object id for ``payload`` tagged with ``obj_type``.

    The framing ``"<type> <len>\\0<payload>"`` is hashed rather than the raw
    payload so that the type participates in the identity of the object.
    """
    header = f"{obj_type} {len(payload)}".encode("utf-8") + _HEADER_SEP
    return hashlib.sha256(header + payload).hexdigest()


def short_hash(object_id: str, length: int = 8) -> str:
    """Return the abbreviated id used for display (like Git's short hashes)."""
    return object_id[:length]
