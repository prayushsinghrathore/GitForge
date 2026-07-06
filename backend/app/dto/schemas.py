"""Pydantic DTOs shared across the API surface."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# requests
# --------------------------------------------------------------------------- #
class StageRequest(BaseModel):
    path: str = Field(..., description="Repo-relative file path")
    content: str = Field("", description="UTF-8 file content to stage")


class CommitRequest(BaseModel):
    message: str
    author: str = "GitForge User"


class MergeRequest(BaseModel):
    branch: str = Field(..., description="Branch to merge into the current one")
    author: str = "GitForge User"


class BranchRequest(BaseModel):
    name: str
    at: Optional[str] = None


# --------------------------------------------------------------------------- #
# core responses
# --------------------------------------------------------------------------- #
class CommitDTO(BaseModel):
    id: str
    short: str
    parents: list[str]
    author: str
    message: str
    timestamp: int
    is_merge: bool
    files_changed: int
    insertions: int
    deletions: int


class BranchDTO(BaseModel):
    name: str
    tip: Optional[str]
    short_tip: Optional[str]
    is_current: bool
    commit_count: int
    last_activity: Optional[int]


class StatusDTO(BaseModel):
    branch: Optional[str]
    staged_new: list[str]
    staged_modified: list[str]
    deleted: list[str]


# --------------------------------------------------------------------------- #
# graph (React Flow friendly)
# --------------------------------------------------------------------------- #
class CommitNodeDTO(BaseModel):
    id: str
    short: str
    author: str
    message: str
    timestamp: int
    is_merge: bool
    is_head: bool
    branch: Optional[str]
    lane: int = Field(..., description="Horizontal track for graph layout")
    row: int = Field(..., description="Vertical position (0 = newest)")
    files_changed: int
    insertions: int
    deletions: int
    insights: list[str] = []


class CommitEdgeDTO(BaseModel):
    source: str  # child commit id
    target: str  # parent commit id
    is_merge: bool


class CommitGraphDTO(BaseModel):
    nodes: list[CommitNodeDTO]
    edges: list[CommitEdgeDTO]
    head: Optional[str]
    lane_count: int


# --------------------------------------------------------------------------- #
# diff / inspector
# --------------------------------------------------------------------------- #
class DiffLineDTO(BaseModel):
    op: str  # equal | add | remove
    old_lineno: Optional[int]
    new_lineno: Optional[int]
    text: str


class DiffFileDTO(BaseModel):
    path: str
    insertions: int
    deletions: int
    lines: list[DiffLineDTO]


class CommitInspectorDTO(BaseModel):
    commit: CommitDTO
    files: list[DiffFileDTO]
    insights: list[str]


class FileHistoryDTO(BaseModel):
    path: str
    commits: list[CommitDTO]


# --------------------------------------------------------------------------- #
# analytics / insights
# --------------------------------------------------------------------------- #
class InsightDTO(BaseModel):
    kind: str  # info | warning | risk
    title: str
    detail: str
    commit_id: Optional[str] = None


class RepoOverviewDTO(BaseModel):
    commit_count: int
    branch_count: int
    current_branch: Optional[str]
    object_count: int
    repository_size_bytes: int
    contributor_count: int
    last_commit: Optional[CommitDTO]
    commits_per_author: dict[str, int]
    activity_by_day: dict[str, int]  # ISO date -> commit count (heatmap)
    most_changed_files: list[dict]
    largest_commits: list[CommitDTO]
    insights: list[InsightDTO]
