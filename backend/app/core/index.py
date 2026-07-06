"""The staging area (a.k.a. the index).

The index is the buffer between the working directory and the next commit. When
a user stages a file we hash its contents into a blob (stored immediately) and
record ``path -> blob_id`` here. ``commit`` then turns the whole index into a
tree and snapshots it.

Modelling the index explicitly — rather than committing the working directory
directly — is what lets a user stage a subset of their changes, and it mirrors
how real version control separates "what I've changed" from "what I've decided
to record."
"""

from __future__ import annotations

import sqlite3
from typing import Optional


class Index:
    """A flat ``path -> blob_id`` map representing the next commit's contents."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS staged (
                path    TEXT PRIMARY KEY,  -- repo-relative path, POSIX style
                blob_id TEXT NOT NULL      -- content id of the staged blob
            )
            """
        )
        self._conn.commit()

    def stage(self, path: str, blob_id: str) -> None:
        self._conn.execute(
            "INSERT INTO staged (path, blob_id) VALUES (?, ?) "
            "ON CONFLICT(path) DO UPDATE SET blob_id = excluded.blob_id",
            (path, blob_id),
        )
        self._conn.commit()

    def unstage(self, path: str) -> None:
        self._conn.execute("DELETE FROM staged WHERE path = ?", (path,))
        self._conn.commit()

    def get(self, path: str) -> Optional[str]:
        cur = self._conn.execute("SELECT blob_id FROM staged WHERE path = ?", (path,))
        row = cur.fetchone()
        return row[0] if row else None

    def entries(self) -> dict[str, str]:
        cur = self._conn.execute("SELECT path, blob_id FROM staged ORDER BY path")
        return {path: blob_id for path, blob_id in cur.fetchall()}

    def replace_all(self, mapping: dict[str, str]) -> None:
        """Reset the index to exactly ``mapping`` (used on checkout)."""
        self._conn.execute("DELETE FROM staged")
        self._conn.executemany(
            "INSERT INTO staged (path, blob_id) VALUES (?, ?)",
            list(mapping.items()),
        )
        self._conn.commit()

    def clear(self) -> None:
        self._conn.execute("DELETE FROM staged")
        self._conn.commit()

    def is_empty(self) -> bool:
        cur = self._conn.execute("SELECT 1 FROM staged LIMIT 1")
        return cur.fetchone() is None
