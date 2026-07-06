"""Content-addressable object store, persisted in SQLite.

The store is the single source of truth for immutable objects. It maps an
object id -> (type, raw payload bytes). Because ids are content hashes, writes
are idempotent: writing the same object twice is a no-op, which is exactly the
deduplication property we want.

Why SQLite instead of a directory of loose files? It keeps the whole repository
in a single portable file, gives us transactional writes, and lets the higher
layers run analytical queries (commit counts, sizes, etc.) without walking the
filesystem. The engine still owns the schema; SQLite is just the backing store.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional, Union

from .objects import Blob, Commit, ObjectType, Tree

StoredObject = Union[Blob, Tree, Commit]


class ObjectStore:
    """Persistent store for blobs, trees and commits keyed by content id."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection
        self._ensure_schema()

    # -- schema ------------------------------------------------------------- #
    def _ensure_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS objects (
                id      TEXT PRIMARY KEY,   -- SHA-256 content id
                type    TEXT NOT NULL,      -- blob | tree | commit
                payload BLOB NOT NULL,      -- canonical serialized bytes
                size    INTEGER NOT NULL    -- len(payload), for analytics
            )
            """
        )
        self._conn.commit()

    # -- writes ------------------------------------------------------------- #
    def put(self, obj: StoredObject) -> str:
        """Persist ``obj`` and return its id. Idempotent by content."""
        payload = obj.serialize()
        object_id = obj.id
        self._conn.execute(
            "INSERT OR IGNORE INTO objects (id, type, payload, size) VALUES (?, ?, ?, ?)",
            (object_id, obj.type.value, payload, len(payload)),
        )
        self._conn.commit()
        return object_id

    # -- reads -------------------------------------------------------------- #
    def _row(self, object_id: str) -> Optional[tuple[str, bytes]]:
        cur = self._conn.execute(
            "SELECT type, payload FROM objects WHERE id = ?", (object_id,)
        )
        row = cur.fetchone()
        return (row[0], row[1]) if row else None

    def exists(self, object_id: str) -> bool:
        cur = self._conn.execute("SELECT 1 FROM objects WHERE id = ?", (object_id,))
        return cur.fetchone() is not None

    def get_blob(self, object_id: str) -> Blob:
        return Blob.deserialize(self._payload(object_id, ObjectType.BLOB))

    def get_tree(self, object_id: str) -> Tree:
        return Tree.deserialize(self._payload(object_id, ObjectType.TREE))

    def get_commit(self, object_id: str) -> Commit:
        return Commit.deserialize(self._payload(object_id, ObjectType.COMMIT))

    def _payload(self, object_id: str, expected: ObjectType) -> bytes:
        row = self._row(object_id)
        if row is None:
            raise KeyError(f"object {object_id!r} not found")
        obj_type, payload = row
        if obj_type != expected.value:
            raise TypeError(
                f"object {object_id!r} is a {obj_type}, expected {expected.value}"
            )
        return payload

    # -- analytics helpers -------------------------------------------------- #
    def total_size(self) -> int:
        cur = self._conn.execute("SELECT COALESCE(SUM(size), 0) FROM objects")
        return int(cur.fetchone()[0])

    def count(self, obj_type: Optional[ObjectType] = None) -> int:
        if obj_type is None:
            cur = self._conn.execute("SELECT COUNT(*) FROM objects")
        else:
            cur = self._conn.execute(
                "SELECT COUNT(*) FROM objects WHERE type = ?", (obj_type.value,)
            )
        return int(cur.fetchone()[0])


def connect(db_path: Path) -> sqlite3.Connection:
    """Open (creating if needed) the SQLite database backing a repository.

    ``check_same_thread=False`` lets a single cached connection be reused across
    the ASGI threadpool that serves sync route handlers. Python's ``sqlite3`` is
    compiled in *serialized* mode, so concurrent use of one connection is guarded
    by an internal mutex; a ``busy_timeout`` absorbs brief writer contention.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn
