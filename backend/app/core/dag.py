"""Commit DAG traversal, ancestry, and lowest common ancestor.

Commits form a directed acyclic graph: each commit points *back* to its
parent(s). Almost every interesting history operation reduces to a graph
question over this DAG:

    * ``log``         -> a topological / time-ordered walk from a tip
    * ``merge``       -> find the merge base = lowest common ancestor of two tips
    * "is X merged?"  -> is X an ancestor of the current tip?

This module keeps those graph algorithms in one place, decoupled from storage:
it only needs a ``load_commit`` callback, so it can run over the real object
store or an in-memory fixture in tests.
"""

from __future__ import annotations

from collections import deque
from typing import Callable, Iterable, Optional

from .objects import Commit

LoadCommit = Callable[[str], Commit]


def ancestors(commit_id: str, load: LoadCommit) -> set[str]:
    """Return ``commit_id`` and all commits reachable by following parents."""
    seen: set[str] = set()
    queue: deque[str] = deque([commit_id])
    while queue:
        current = queue.popleft()
        if current in seen:
            continue
        seen.add(current)
        queue.extend(load(current).parents)
    return seen


def is_ancestor(candidate: str, of: str, load: LoadCommit) -> bool:
    """True if ``candidate`` is an ancestor of (or equal to) ``of``."""
    return candidate in ancestors(of, load)


def _generation(commit_id: str, load: LoadCommit) -> dict[str, int]:
    """Map each ancestor to its shortest distance from ``commit_id``.

    Distance is used to break ties when several common ancestors exist: the
    *lowest* common ancestor is the common one nearest the tips.
    """
    dist: dict[str, int] = {commit_id: 0}
    queue: deque[str] = deque([commit_id])
    while queue:
        current = queue.popleft()
        for parent in load(current).parents:
            nd = dist[current] + 1
            if parent not in dist or nd < dist[parent]:
                dist[parent] = nd
                queue.append(parent)
    return dist


def merge_base(a: str, b: str, load: LoadCommit) -> Optional[str]:
    """Lowest common ancestor of commits ``a`` and ``b``.

    Returns the common ancestor minimizing distance-from-``a`` (ties broken by
    distance-from-``b``), or ``None`` if the two histories are unrelated.
    """
    if a == b:
        return a
    dist_a = _generation(a, load)
    ancestors_b = ancestors(b, load)
    common = [cid for cid in dist_a if cid in ancestors_b]
    if not common:
        return None
    dist_b = _generation(b, load)
    return min(common, key=lambda cid: (dist_a[cid] + dist_b.get(cid, 0), dist_a[cid]))


def topological_history(
    tips: Iterable[str], load: LoadCommit
) -> list[Commit]:
    """Return commits reachable from ``tips``, newest first.

    Ordering is by timestamp descending with the commit id as a stable
    tiebreaker, which gives a deterministic, human-friendly ``log`` while
    respecting that a child is always shown before its parents when timestamps
    differ (the normal case).
    """
    reachable: set[str] = set()
    for tip in tips:
        if tip:
            reachable |= ancestors(tip, load)
    commits = [load(cid) for cid in reachable]
    return sorted(commits, key=lambda c: (c.timestamp, c.id), reverse=True)
