"""The three object kinds that make up a GitForge repository.

    Blob   -> the contents of a single file
    Tree   -> a directory snapshot: an ordered set of (name -> entry) rows
    Commit -> a full snapshot: a root tree + parent commit(s) + metadata

Objects are immutable value types. Each one knows how to serialize itself to a
deterministic byte string and to compute its own content id via
``hashing.hash_bytes``. Determinism is essential: the id must depend only on
content, never on insertion order, dict ordering, or wall-clock time of
serialization. That is why tree entries are always sorted by name.

Serialization format is a small, human-inspectable text format (not Git's exact
binary format) — chosen so the stored objects are easy to debug and reason
about, while keeping the same conceptual model.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable

from .hashing import hash_bytes


class ObjectType(str, Enum):
    BLOB = "blob"
    TREE = "tree"
    COMMIT = "commit"


class EntryMode(str, Enum):
    """A tree entry is either a file (blob) or a sub-directory (tree)."""

    FILE = "file"
    DIR = "dir"


# --------------------------------------------------------------------------- #
# Blob
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Blob:
    """Opaque file content. The engine treats file bytes as-is."""

    data: bytes

    @property
    def type(self) -> ObjectType:
        return ObjectType.BLOB

    def serialize(self) -> bytes:
        return self.data

    @classmethod
    def deserialize(cls, payload: bytes) -> "Blob":
        return cls(data=payload)

    @property
    def id(self) -> str:
        return hash_bytes(self.type.value, self.serialize())


# --------------------------------------------------------------------------- #
# Tree
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class TreeEntry:
    """One row inside a tree: a name bound to another object.

    ``mode`` distinguishes a file (points at a blob) from a sub-directory
    (points at another tree). ``object_id`` is the id of that target object.
    """

    name: str
    mode: EntryMode
    object_id: str


@dataclass(frozen=True)
class Tree:
    """A directory snapshot.

    Entries are kept in a tuple but always emitted in sorted order so the
    serialized form — and therefore the tree id — is deterministic.
    """

    entries: tuple[TreeEntry, ...] = ()

    @property
    def type(self) -> ObjectType:
        return ObjectType.TREE

    @classmethod
    def from_entries(cls, entries: Iterable[TreeEntry]) -> "Tree":
        return cls(entries=tuple(sorted(entries, key=lambda e: e.name)))

    def serialize(self) -> bytes:
        # One entry per line: "<mode> <object_id> <name>". Names are unique
        # within a tree, so sorting by name yields a total order.
        lines = [
            f"{e.mode.value} {e.object_id} {e.name}"
            for e in sorted(self.entries, key=lambda e: e.name)
        ]
        return ("\n".join(lines)).encode("utf-8")

    @classmethod
    def deserialize(cls, payload: bytes) -> "Tree":
        text = payload.decode("utf-8")
        entries: list[TreeEntry] = []
        for line in text.splitlines():
            if not line:
                continue
            mode, object_id, name = line.split(" ", 2)
            entries.append(TreeEntry(name=name, mode=EntryMode(mode), object_id=object_id))
        return cls.from_entries(entries)

    @property
    def id(self) -> str:
        return hash_bytes(self.type.value, self.serialize())


# --------------------------------------------------------------------------- #
# Commit
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Commit:
    """A point-in-time snapshot of the whole working tree.

    A commit references exactly one root ``tree`` and zero or more
    ``parents``:

        * 0 parents  -> the root/initial commit
        * 1 parent   -> an ordinary commit
        * 2+ parents -> a merge commit

    ``timestamp`` is an explicit field (unix seconds) rather than being read
    from the clock at serialization time, so commit ids stay reproducible.
    """

    tree_id: str
    parents: tuple[str, ...]
    author: str
    message: str
    timestamp: int
    # Denormalized stats captured at commit time so history/graph views don't
    # have to recompute diffs for every node. Not part of identity semantics
    # in spirit, but included in the payload so they travel with the commit.
    files_changed: int = 0
    insertions: int = 0
    deletions: int = 0

    @property
    def type(self) -> ObjectType:
        return ObjectType.COMMIT

    @property
    def is_merge(self) -> bool:
        return len(self.parents) >= 2

    def serialize(self) -> bytes:
        lines = [f"tree {self.tree_id}"]
        for parent in self.parents:
            lines.append(f"parent {parent}")
        lines.append(f"author {self.author}")
        lines.append(f"timestamp {self.timestamp}")
        lines.append(
            f"stats {self.files_changed} {self.insertions} {self.deletions}"
        )
        lines.append("")  # blank line separates headers from the message body
        lines.append(self.message)
        return ("\n".join(lines)).encode("utf-8")

    @classmethod
    def deserialize(cls, payload: bytes) -> "Commit":
        text = payload.decode("utf-8")
        header, _, message = text.partition("\n\n")
        tree_id = ""
        parents: list[str] = []
        author = ""
        timestamp = 0
        files_changed = insertions = deletions = 0
        for line in header.splitlines():
            key, _, value = line.partition(" ")
            if key == "tree":
                tree_id = value
            elif key == "parent":
                parents.append(value)
            elif key == "author":
                author = value
            elif key == "timestamp":
                timestamp = int(value)
            elif key == "stats":
                fc, ins, dels = value.split(" ")
                files_changed, insertions, deletions = int(fc), int(ins), int(dels)
        return cls(
            tree_id=tree_id,
            parents=tuple(parents),
            author=author,
            message=message,
            timestamp=timestamp,
            files_changed=files_changed,
            insertions=insertions,
            deletions=deletions,
        )

    @property
    def id(self) -> str:
        return hash_bytes(self.type.value, self.serialize())
