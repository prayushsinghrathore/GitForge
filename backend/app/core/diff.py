"""Line-level diffing via Longest Common Subsequence.

Given two versions of a file as lists of lines, we compute the classic LCS and
walk it to emit a sequence of hunks: unchanged, added, or removed lines. This is
the same algorithm underneath ``diff(1)`` and Git's default diff. Modified lines
are represented as a removal immediately followed by an addition — the UI pairs
them up for a side-by-side "modified" view.

The implementation is intentionally dependency-free and O(n*m) in time/space,
which is more than adequate for source files and keeps the logic transparent.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Sequence


class LineOp(str, Enum):
    EQUAL = "equal"
    ADD = "add"
    REMOVE = "remove"


@dataclass(frozen=True)
class DiffLine:
    op: LineOp
    # Line numbers are 1-based and refer to the side where the line exists
    # (old side for REMOVE/EQUAL, new side for ADD/EQUAL). ``None`` when the
    # line does not exist on that side.
    old_lineno: int | None
    new_lineno: int | None
    text: str


@dataclass(frozen=True)
class FileDiff:
    """The full set of line operations transforming ``old`` into ``new``."""

    lines: tuple[DiffLine, ...]

    @property
    def insertions(self) -> int:
        return sum(1 for line in self.lines if line.op is LineOp.ADD)

    @property
    def deletions(self) -> int:
        return sum(1 for line in self.lines if line.op is LineOp.REMOVE)


def _lcs_table(a: Sequence[str], b: Sequence[str]) -> list[list[int]]:
    """Bottom-up LCS length table. ``dp[i][j]`` = LCS of a[i:] and b[j:]."""
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            if a[i] == b[j]:
                dp[i][j] = dp[i + 1][j + 1] + 1
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])
    return dp


def diff_lines(old: Sequence[str], new: Sequence[str]) -> FileDiff:
    """Diff two sequences of lines, returning ordered :class:`DiffLine` ops."""
    dp = _lcs_table(old, new)
    i = j = 0
    old_no = new_no = 1
    out: list[DiffLine] = []
    n, m = len(old), len(new)

    while i < n and j < m:
        if old[i] == new[j]:
            out.append(DiffLine(LineOp.EQUAL, old_no, new_no, old[i]))
            i, j, old_no, new_no = i + 1, j + 1, old_no + 1, new_no + 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            # Dropping old[i] keeps the LCS at least as long -> it was removed.
            out.append(DiffLine(LineOp.REMOVE, old_no, None, old[i]))
            i, old_no = i + 1, old_no + 1
        else:
            out.append(DiffLine(LineOp.ADD, None, new_no, new[j]))
            j, new_no = j + 1, new_no + 1

    while i < n:
        out.append(DiffLine(LineOp.REMOVE, old_no, None, old[i]))
        i, old_no = i + 1, old_no + 1
    while j < m:
        out.append(DiffLine(LineOp.ADD, None, new_no, new[j]))
        j, new_no = j + 1, new_no + 1

    return FileDiff(lines=tuple(out))


def diff_text(old: str, new: str) -> FileDiff:
    """Convenience wrapper diffing two whole strings by their lines."""
    old_lines = old.splitlines() if old else []
    new_lines = new.splitlines() if new else []
    return diff_lines(old_lines, new_lines)
