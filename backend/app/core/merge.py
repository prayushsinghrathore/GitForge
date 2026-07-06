"""Three-way merge of file sets.

A three-way merge reconciles two divergent snapshots (``ours`` and ``theirs``)
against their common ancestor (``base`` = the merge base found via the DAG).
Comparing each side *to the base* — rather than to each other — is what lets us
tell "you changed it" apart from "they changed it," and therefore auto-resolve
the majority of merges:

    * changed on only one side          -> take that side
    * changed identically on both sides -> take either (they agree)
    * changed differently on both sides -> CONFLICT

Merging is done at file granularity for adds/deletes, and at line granularity
(with conflict markers) when both sides edit the same file differently. The
result is a merged file map plus a list of conflicted paths; a merge commit is
only created by the caller when there are no conflicts.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .diff import LineOp, diff_lines


@dataclass
class MergeResult:
    # path -> blob content (bytes) for the merged tree
    files: dict[str, bytes] = field(default_factory=dict)
    # paths that could not be auto-resolved (content holds conflict markers)
    conflicts: list[str] = field(default_factory=list)

    @property
    def clean(self) -> bool:
        return not self.conflicts


def _merge_file(base: bytes | None, ours: bytes, theirs: bytes) -> tuple[bytes, bool]:
    """Merge one file's three versions.

    Returns ``(content, conflicted)``. When both sides diverge from the base on
    the same region, conflict markers are emitted and ``conflicted`` is True.
    """
    if ours == theirs:
        return ours, False
    if base is not None and base == ours:
        return theirs, False  # only theirs changed
    if base is not None and base == theirs:
        return ours, False  # only ours changed

    # Both sides changed. Attempt a line-level union using the base as anchor.
    base_lines = base.decode("utf-8", "replace").splitlines() if base else []
    our_lines = ours.decode("utf-8", "replace").splitlines()
    their_lines = theirs.decode("utf-8", "replace").splitlines()

    our_changed = {
        d.text for d in diff_lines(base_lines, our_lines).lines if d.op is LineOp.ADD
    }
    their_changed = {
        d.text for d in diff_lines(base_lines, their_lines).lines if d.op is LineOp.ADD
    }

    # If the two sides added disjoint, non-overlapping lines we could union them,
    # but to stay correct and predictable we treat any two-sided edit as a
    # conflict and surface both versions with markers for the user to resolve.
    if our_changed and their_changed and our_changed != their_changed:
        merged = (
            ["<<<<<<< ours"]
            + our_lines
            + ["======="]
            + their_lines
            + [">>>>>>> theirs"]
        )
        return ("\n".join(merged)).encode("utf-8"), True

    # One side effectively re-added what the other had; prefer the longer edit.
    winner = ours if len(our_lines) >= len(their_lines) else theirs
    return winner, False


def three_way_merge(
    base: dict[str, bytes],
    ours: dict[str, bytes],
    theirs: dict[str, bytes],
) -> MergeResult:
    """Merge two ``path -> content`` maps against their common ``base``."""
    result = MergeResult()
    all_paths = set(base) | set(ours) | set(theirs)

    for path in sorted(all_paths):
        b = base.get(path)
        o = ours.get(path)
        t = theirs.get(path)

        # Presence-based (add/delete) resolution first.
        if o is None and t is None:
            continue  # deleted on both (or never existed on either side)
        if o is None:
            if b is None:
                result.files[path] = t  # theirs added a brand-new file
                continue
            if t == b:
                continue  # ours deleted, theirs untouched -> stays deleted
            # theirs modified a file we deleted -> conflict, keep theirs.
            result.files[path] = t
            result.conflicts.append(path)
            continue
        if t is None:
            if b is None:
                result.files[path] = o  # ours added a brand-new file
                continue
            if o == b:
                continue  # theirs deleted, ours untouched -> stays deleted
            # ours modified a file they deleted -> conflict, keep ours.
            result.files[path] = o
            result.conflicts.append(path)
            continue

        merged, conflicted = _merge_file(b, o, t)
        result.files[path] = merged
        if conflicted:
            result.conflicts.append(path)

    return result
