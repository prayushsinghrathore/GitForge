"""Commit-graph layout — turns the DAG into positioned nodes for the UI.

The frontend renders commits with React Flow, which needs each node to have a
concrete (lane, row) coordinate. This service computes that layout:

    * row  = vertical order, newest commit at row 0 (time-descending)
    * lane = a horizontal track, so parallel branches don't overlap

Lane assignment uses a simple, well-known "swim-lane" heuristic used by most
commit-graph visualizers: walk commits newest -> oldest, keep a set of "active
lanes" each reserved by the commit that still needs to draw a line down to a
parent, and place each commit in the lane that was reserved for it (or a fresh
lane if none). A commit reserves lanes for its parents, reusing its own lane for
the first parent so mainline history stays in a straight column.

The result is deterministic and stable, which matters for smooth animated
transitions on the client.
"""

from __future__ import annotations

from typing import Optional

from ..core import Repository
from ..core.repository import CommitInfo
from ..dto import CommitEdgeDTO, CommitGraphDTO, CommitNodeDTO


class GraphService:
    def __init__(self, repo: Repository) -> None:
        self._repo = repo

    def build_graph(self, insight_fn=None) -> CommitGraphDTO:
        history = self._repo.log()  # newest -> oldest across HEAD's ancestry
        head = self._repo.refs.head_commit()
        branch_tips = self._branch_tip_labels()

        lanes, lane_count = self._assign_lanes(history)

        nodes: list[CommitNodeDTO] = []
        edges: list[CommitEdgeDTO] = []
        for row, info in enumerate(history):
            nodes.append(
                CommitNodeDTO(
                    id=info.id,
                    short=info.id[:8],
                    author=info.author,
                    message=info.message.splitlines()[0] if info.message else "",
                    timestamp=info.timestamp,
                    is_merge=info.is_merge,
                    is_head=info.id == head,
                    branch=branch_tips.get(info.id),
                    lane=lanes[info.id],
                    row=row,
                    files_changed=info.files_changed,
                    insertions=info.insertions,
                    deletions=info.deletions,
                    insights=insight_fn(info) if insight_fn else [],
                )
            )
            for parent in info.parents:
                edges.append(
                    CommitEdgeDTO(
                        source=info.id,
                        target=parent,
                        is_merge=info.is_merge and parent != info.parents[0],
                    )
                )

        return CommitGraphDTO(
            nodes=nodes, edges=edges, head=head, lane_count=max(lane_count, 1)
        )

    # -- lane assignment ---------------------------------------------------- #
    def _assign_lanes(self, history: list[CommitInfo]) -> tuple[dict[str, int], int]:
        """Assign each commit a lane using reserved-lane swim-lane packing."""
        order = {info.id: i for i, info in enumerate(history)}
        # active_lanes[i] holds the commit id that currently "owns" lane i, i.e.
        # the next commit expected to be drawn in that lane (a reserved parent).
        active_lanes: list[Optional[str]] = []
        lanes: dict[str, int] = {}
        max_lane = 0

        for info in history:  # newest -> oldest
            lane = self._claim_lane(active_lanes, info.id)
            lanes[info.id] = lane
            max_lane = max(max_lane, lane)

            # Free our own reservation; we've now been placed.
            active_lanes[lane] = None

            # Reserve lanes for parents that are part of this history. The first
            # parent inherits our lane (keeps mainline straight); additional
            # parents (merges) fan out into new/free lanes.
            parents = [p for p in info.parents if p in order]
            for idx, parent in enumerate(parents):
                if idx == 0:
                    self._reserve(active_lanes, lane, parent)
                else:
                    max_lane = max(max_lane, self._reserve_free(active_lanes, parent))

        return lanes, max_lane + 1

    @staticmethod
    def _claim_lane(active_lanes: list[Optional[str]], commit_id: str) -> int:
        for i, owner in enumerate(active_lanes):
            if owner == commit_id:
                return i
        # Not reserved by any child -> a branch tip. Take a free lane or extend.
        for i, owner in enumerate(active_lanes):
            if owner is None:
                return i
        active_lanes.append(None)
        return len(active_lanes) - 1

    @staticmethod
    def _reserve(active_lanes: list[Optional[str]], lane: int, commit_id: str) -> None:
        # Don't clobber a reservation already made by an earlier (newer) child.
        if active_lanes[lane] is None:
            active_lanes[lane] = commit_id
        else:
            GraphService._reserve_free(active_lanes, commit_id)

    @staticmethod
    def _reserve_free(active_lanes: list[Optional[str]], commit_id: str) -> int:
        if commit_id in active_lanes:
            return active_lanes.index(commit_id)
        for i, owner in enumerate(active_lanes):
            if owner is None:
                active_lanes[i] = commit_id
                return i
        active_lanes.append(commit_id)
        return len(active_lanes) - 1

    def _branch_tip_labels(self) -> dict[str, str]:
        """Map each branch-tip commit id -> branch name for node badges."""
        labels: dict[str, str] = {}
        for name, tip in self._repo.refs.list_branches().items():
            if tip:
                labels[tip] = name
        return labels
