"""The Repository facade — the public surface of the VCS engine.

Everything below this file is a small, single-purpose collaborator (object
store, refs, index, diff, dag, merge). ``Repository`` composes them into the
high-level commands a user thinks in terms of:

    init · add · commit · log · status · branch · checkout · merge · diff ·
    restore · file history

Design notes
------------
* The engine is **filesystem-model agnostic**: a working tree is just a
  ``path -> bytes`` dict passed in and out. The API/CLI decide whether that maps
  to real files, an upload, or an in-memory fixture. This keeps the core pure
  and trivially testable.
* Trees are built from the flat index by grouping paths into nested
  directories, so history is a true tree of trees (not a flat file list).
* No part of this module shells out to Git or imports it. All version-control
  semantics are implemented here.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from . import dag
from .diff import FileDiff, diff_text
from .index import Index
from .merge import three_way_merge
from .object_store import ObjectStore, connect
from .objects import Blob, Commit, EntryMode, Tree, TreeEntry
from .refs import RefStore

DEFAULT_BRANCH = "main"


class RepositoryError(Exception):
    """Raised for user-facing engine errors (bad checkout, conflicts, ...)."""


@dataclass(frozen=True)
class CommitInfo:
    """A lightweight DTO-ish view of a commit for history/graph consumers."""

    id: str
    parents: tuple[str, ...]
    author: str
    message: str
    timestamp: int
    is_merge: bool
    files_changed: int
    insertions: int
    deletions: int


class Repository:
    """A GitForge repository backed by a single SQLite database."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection
        self.objects = ObjectStore(connection)
        self.refs = RefStore(connection)
        self.index = Index(connection)

    # -- lifecycle ---------------------------------------------------------- #
    @classmethod
    def open(cls, db_path: Path) -> "Repository":
        return cls(connect(Path(db_path)))

    @classmethod
    def init(cls, db_path: Path, default_branch: str = DEFAULT_BRANCH) -> "Repository":
        """Create a new repository with an unborn default branch."""
        repo = cls.open(db_path)
        if repo.refs.head_branch() is None:
            repo.refs.create_branch(default_branch, None)
            repo.refs.set_head(default_branch)
        return repo

    # -- staging ------------------------------------------------------------ #
    def stage_file(self, path: str, content: bytes) -> str:
        """Hash ``content`` into a blob, store it, and stage ``path``."""
        blob = Blob(content)
        self.objects.put(blob)
        self.index.stage(_normalize(path), blob.id)
        return blob.id

    def unstage_file(self, path: str) -> None:
        self.index.unstage(_normalize(path))

    # -- committing --------------------------------------------------------- #
    def commit(self, message: str, author: str, timestamp: int) -> str:
        """Snapshot the current index as a new commit; advance HEAD's branch."""
        staged = self.index.entries()
        if not staged:
            raise RepositoryError("nothing staged to commit")

        parent_id = self.refs.head_commit()
        parents = (parent_id,) if parent_id else ()

        # Compute stats against the parent snapshot for rich history views.
        prev_files = self._commit_file_map(parent_id) if parent_id else {}
        new_files = {p: self.objects.get_blob(b).data for p, b in staged.items()}
        fc, ins, dels = _stat_delta(prev_files, new_files)

        tree_id = self._build_tree(staged)
        commit = Commit(
            tree_id=tree_id,
            parents=parents,
            author=author,
            message=message,
            timestamp=timestamp,
            files_changed=fc,
            insertions=ins,
            deletions=dels,
        )
        self.objects.put(commit)
        self._advance_head(commit.id)
        return commit.id

    def _advance_head(self, commit_id: str) -> None:
        branch = self.refs.head_branch()
        if branch is None:
            raise RepositoryError("HEAD is not attached to a branch")
        if self.refs.branch_exists(branch):
            self.refs.update_branch(branch, commit_id)
        else:
            self.refs.create_branch(branch, commit_id)

    # -- history ------------------------------------------------------------ #
    def log(self, branch: Optional[str] = None) -> list[CommitInfo]:
        """Return commit history newest-first from ``branch`` (or HEAD)."""
        tip = self.refs.get_branch(branch) if branch else self.refs.head_commit()
        if not tip:
            return []
        commits = dag.topological_history([tip], self.objects.get_commit)
        return [_to_info(c) for c in commits]

    def get_commit(self, commit_id: str) -> CommitInfo:
        return _to_info(self.objects.get_commit(commit_id))

    # -- branches ----------------------------------------------------------- #
    def create_branch(self, name: str, at: Optional[str] = None) -> None:
        if self.refs.branch_exists(name):
            raise RepositoryError(f"branch {name!r} already exists")
        target = at or self.refs.head_commit()
        self.refs.create_branch(name, target)

    def checkout(self, branch: str) -> None:
        """Switch HEAD to ``branch`` and reset the index to its snapshot."""
        if not self.refs.branch_exists(branch):
            raise RepositoryError(f"branch {branch!r} does not exist")
        self.refs.set_head(branch)
        tip = self.refs.get_branch(branch)
        self.index.replace_all(self._commit_blob_map(tip) if tip else {})

    def checkout_commit(self, commit_id: str, into_branch: str) -> None:
        """Materialize an arbitrary commit onto a fresh branch (detached-safe)."""
        self.objects.get_commit(commit_id)  # validates existence
        if not self.refs.branch_exists(into_branch):
            self.refs.create_branch(into_branch, commit_id)
        else:
            self.refs.update_branch(into_branch, commit_id)
        self.refs.set_head(into_branch)
        self.index.replace_all(self._commit_blob_map(commit_id))

    # -- merge -------------------------------------------------------------- #
    def merge(self, other: str, author: str, timestamp: int) -> str:
        """Merge branch ``other`` into the current branch.

        Handles fast-forward, up-to-date, and true three-way merges. Raises
        :class:`RepositoryError` with the conflicted paths when a merge cannot
        be auto-resolved.
        """
        current_branch = self.refs.head_branch()
        if current_branch is None:
            raise RepositoryError("HEAD is not attached to a branch")
        ours = self.refs.head_commit()
        theirs = self.refs.get_branch(other)
        if not theirs:
            raise RepositoryError(f"branch {other!r} has no commits")
        if not ours:
            # Unborn current branch: just point at theirs.
            self._advance_head(theirs)
            self.index.replace_all(self._commit_blob_map(theirs))
            return theirs

        base = dag.merge_base(ours, theirs, self.objects.get_commit)

        if base == theirs:
            return ours  # already up to date
        if base == ours:
            # Fast-forward: current branch has no unique commits.
            self._advance_head(theirs)
            self.index.replace_all(self._commit_blob_map(theirs))
            return theirs

        base_files = self._commit_file_map(base) if base else {}
        our_files = self._commit_file_map(ours)
        their_files = self._commit_file_map(theirs)
        result = three_way_merge(base_files, our_files, their_files)
        if not result.clean:
            raise RepositoryError(
                "merge conflict in: " + ", ".join(result.conflicts)
            )

        # Stage the merged snapshot and create a two-parent merge commit.
        staged: dict[str, str] = {}
        for path, content in result.files.items():
            blob = Blob(content)
            self.objects.put(blob)
            staged[path] = blob.id
        self.index.replace_all(staged)

        tree_id = self._build_tree(staged)
        fc, ins, dels = _stat_delta(our_files, result.files)
        merge_commit = Commit(
            tree_id=tree_id,
            parents=(ours, theirs),
            author=author,
            message=f"Merge branch '{other}' into '{current_branch}'",
            timestamp=timestamp,
            files_changed=fc,
            insertions=ins,
            deletions=dels,
        )
        self.objects.put(merge_commit)
        self._advance_head(merge_commit.id)
        return merge_commit.id

    # -- diff / status ------------------------------------------------------ #
    def diff_commits(self, old_id: Optional[str], new_id: str) -> dict[str, FileDiff]:
        """Per-file diff between two commits (or from nothing -> ``new_id``)."""
        old_files = self._commit_file_map(old_id) if old_id else {}
        new_files = self._commit_file_map(new_id)
        diffs: dict[str, FileDiff] = {}
        for path in sorted(set(old_files) | set(new_files)):
            before = old_files.get(path, b"").decode("utf-8", "replace")
            after = new_files.get(path, b"").decode("utf-8", "replace")
            if before != after:
                diffs[path] = diff_text(before, after)
        return diffs

    def status(self) -> dict[str, list[str]]:
        """Compare the staged index to HEAD's snapshot."""
        head = self.refs.head_commit()
        committed = self._commit_blob_map(head) if head else {}
        staged = self.index.entries()
        added = [p for p in staged if p not in committed]
        modified = [p for p in staged if p in committed and staged[p] != committed[p]]
        deleted = [p for p in committed if p not in staged]
        return {
            "staged_new": sorted(added),
            "staged_modified": sorted(modified),
            "deleted": sorted(deleted),
        }

    # -- restore ------------------------------------------------------------ #
    def restore_file(self, path: str, commit_id: Optional[str] = None) -> bytes:
        """Recover a file's content from ``commit_id`` (or HEAD) and re-stage it."""
        path = _normalize(path)
        source = commit_id or self.refs.head_commit()
        if not source:
            raise RepositoryError("no commit to restore from")
        files = self._commit_file_map(source)
        if path not in files:
            raise RepositoryError(f"{path!r} not found in commit {source[:8]}")
        content = files[path]
        self.stage_file(path, content)
        return content

    def file_history(self, path: str) -> list[CommitInfo]:
        """Every commit in which ``path``'s content changed, newest first.

        A commit is included when the file's blob differs from that of *every*
        parent (for a root commit, when the file is present). Comparing against
        the commit's real parents — rather than adjacent entries in a flattened
        log — keeps the result correct across branches and merges.
        """
        path = _normalize(path)
        head = self.refs.head_commit()
        if not head:
            return []
        history = dag.topological_history([head], self.objects.get_commit)
        out: list[CommitInfo] = []
        for commit in history:  # newest -> oldest
            current = self._commit_blob_map(commit.id).get(path)
            if current is None:
                continue  # file absent here -> not introduced/changed by it
            parent_blobs = {
                self._commit_blob_map(p).get(path) for p in commit.parents
            }
            # Root commit (no parents) that has the file, or a commit whose blob
            # matches none of its parents, is where the content changed.
            if not commit.parents or current not in parent_blobs:
                out.append(_to_info(commit))
        return out

    # -- tree helpers ------------------------------------------------------- #
    def _build_tree(self, staged: dict[str, str]) -> str:
        """Turn a flat ``path -> blob_id`` index into nested trees; return root id."""
        root: dict = {}
        for path, blob_id in staged.items():
            parts = path.split("/")
            node = root
            for part in parts[:-1]:
                node = node.setdefault(part, {})
            node[parts[-1]] = blob_id
        return self._write_tree(root)

    def _write_tree(self, node: dict) -> str:
        entries: list[TreeEntry] = []
        for name, value in node.items():
            if isinstance(value, dict):
                subtree_id = self._write_tree(value)
                entries.append(TreeEntry(name, EntryMode.DIR, subtree_id))
            else:
                entries.append(TreeEntry(name, EntryMode.FILE, value))
        tree = Tree.from_entries(entries)
        self.objects.put(tree)
        return tree.id

    def _read_tree(self, tree_id: str, prefix: str = "") -> dict[str, str]:
        """Flatten a tree back into ``path -> blob_id``."""
        tree = self.objects.get_tree(tree_id)
        out: dict[str, str] = {}
        for entry in tree.entries:
            full = f"{prefix}{entry.name}"
            if entry.mode is EntryMode.DIR:
                out.update(self._read_tree(entry.object_id, prefix=f"{full}/"))
            else:
                out[full] = entry.object_id
        return out

    def _commit_blob_map(self, commit_id: Optional[str]) -> dict[str, str]:
        if not commit_id:
            return {}
        commit = self.objects.get_commit(commit_id)
        return self._read_tree(commit.tree_id)

    def _commit_file_map(self, commit_id: Optional[str]) -> dict[str, bytes]:
        return {
            path: self.objects.get_blob(blob_id).data
            for path, blob_id in self._commit_blob_map(commit_id).items()
        }


# --------------------------------------------------------------------------- #
# module-level helpers
# --------------------------------------------------------------------------- #
def _normalize(path: str) -> str:
    """Canonicalize a repo path to forward-slash, no leading ``./`` or ``/``."""
    return path.replace("\\", "/").lstrip("./").lstrip("/")


def _to_info(commit: Commit) -> CommitInfo:
    return CommitInfo(
        id=commit.id,
        parents=commit.parents,
        author=commit.author,
        message=commit.message,
        timestamp=commit.timestamp,
        is_merge=commit.is_merge,
        files_changed=commit.files_changed,
        insertions=commit.insertions,
        deletions=commit.deletions,
    )


def _stat_delta(
    old: dict[str, bytes], new: dict[str, bytes]
) -> tuple[int, int, int]:
    """Aggregate (files_changed, insertions, deletions) between two snapshots."""
    files_changed = insertions = deletions = 0
    for path in set(old) | set(new):
        before = old.get(path, b"").decode("utf-8", "replace")
        after = new.get(path, b"").decode("utf-8", "replace")
        if before == after:
            continue
        files_changed += 1
        d = diff_text(before, after)
        insertions += d.insertions
        deletions += d.deletions
    return files_changed, insertions, deletions
