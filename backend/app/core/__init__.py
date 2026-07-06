"""GitForge version-control engine (framework-free, Git-independent).

Public surface: :class:`Repository` and its :class:`CommitInfo` view type,
plus the diff primitives used by higher layers.
"""

from .diff import DiffLine, FileDiff, LineOp, diff_lines, diff_text
from .merge import MergeResult, three_way_merge
from .objects import Blob, Commit, EntryMode, ObjectType, Tree, TreeEntry
from .repository import CommitInfo, Repository, RepositoryError

__all__ = [
    "Repository",
    "RepositoryError",
    "CommitInfo",
    "Blob",
    "Tree",
    "TreeEntry",
    "Commit",
    "ObjectType",
    "EntryMode",
    "FileDiff",
    "DiffLine",
    "LineOp",
    "diff_lines",
    "diff_text",
    "MergeResult",
    "three_way_merge",
]
