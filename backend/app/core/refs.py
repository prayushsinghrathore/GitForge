"""Mutable pointers into the immutable object graph: branches and HEAD.

Objects (blobs/trees/commits) are immutable and content-addressed. What makes a
repository feel *alive* is a small set of mutable named pointers layered on top:

    * a branch is a name -> commit-id binding that moves forward on each commit
    * HEAD is a pointer to the "current" branch (a symbolic ref) — the thing you
      are committing onto and that ``checkout`` moves around

Keeping refs in their own SQLite table (rather than inside the object store)
cleanly separates the immutable history from the mutable "where am I" state.
"""

from __future__ import annotations

import sqlite3
from typing import Optional

HEAD_KEY = "HEAD"


class RefStore:
    """Branch table plus the singleton HEAD pointer."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS refs (
                name      TEXT PRIMARY KEY,  -- branch name
                commit_id TEXT               -- tip commit id (NULL = unborn)
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS head (
                id     INTEGER PRIMARY KEY CHECK (id = 0),  -- single row
                branch TEXT NOT NULL                        -- current branch name
            )
            """
        )
        self._conn.commit()

    # -- HEAD --------------------------------------------------------------- #
    def set_head(self, branch: str) -> None:
        self._conn.execute(
            "INSERT INTO head (id, branch) VALUES (0, ?) "
            "ON CONFLICT(id) DO UPDATE SET branch = excluded.branch",
            (branch,),
        )
        self._conn.commit()

    def head_branch(self) -> Optional[str]:
        cur = self._conn.execute("SELECT branch FROM head WHERE id = 0")
        row = cur.fetchone()
        return row[0] if row else None

    def head_commit(self) -> Optional[str]:
        branch = self.head_branch()
        return self.get_branch(branch) if branch else None

    # -- branches ----------------------------------------------------------- #
    def create_branch(self, name: str, commit_id: Optional[str]) -> None:
        self._conn.execute(
            "INSERT INTO refs (name, commit_id) VALUES (?, ?)", (name, commit_id)
        )
        self._conn.commit()

    def update_branch(self, name: str, commit_id: str) -> None:
        self._conn.execute(
            "UPDATE refs SET commit_id = ? WHERE name = ?", (commit_id, name)
        )
        self._conn.commit()

    def get_branch(self, name: str) -> Optional[str]:
        cur = self._conn.execute("SELECT commit_id FROM refs WHERE name = ?", (name,))
        row = cur.fetchone()
        return row[0] if row else None

    def branch_exists(self, name: str) -> bool:
        cur = self._conn.execute("SELECT 1 FROM refs WHERE name = ?", (name,))
        return cur.fetchone() is not None

    def delete_branch(self, name: str) -> None:
        self._conn.execute("DELETE FROM refs WHERE name = ?", (name,))
        self._conn.commit()

    def list_branches(self) -> dict[str, Optional[str]]:
        cur = self._conn.execute("SELECT name, commit_id FROM refs ORDER BY name")
        return {name: commit_id for name, commit_id in cur.fetchall()}
