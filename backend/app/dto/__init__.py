"""Data Transfer Objects — the API's request/response contract.

DTOs decouple the transport shape (what the frontend consumes) from the engine's
internal value types. The service layer maps ``core.CommitInfo`` etc. into these
Pydantic models, so the API can evolve independently of engine internals.
"""

from .schemas import (
    BranchDTO,
    BranchRequest,
    CommitDTO,
    CommitNodeDTO,
    CommitEdgeDTO,
    CommitGraphDTO,
    CommitInspectorDTO,
    CommitRequest,
    DiffFileDTO,
    DiffLineDTO,
    FileHistoryDTO,
    InsightDTO,
    MergeRequest,
    RepoOverviewDTO,
    StageRequest,
    StatusDTO,
)

__all__ = [
    "BranchDTO",
    "BranchRequest",
    "CommitDTO",
    "CommitNodeDTO",
    "CommitEdgeDTO",
    "CommitGraphDTO",
    "CommitInspectorDTO",
    "CommitRequest",
    "DiffFileDTO",
    "DiffLineDTO",
    "FileHistoryDTO",
    "InsightDTO",
    "MergeRequest",
    "RepoOverviewDTO",
    "StageRequest",
    "StatusDTO",
]
