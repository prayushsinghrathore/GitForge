"""REST endpoints for a single named repository.

Routes are intentionally thin: validate/parse via DTOs, delegate to a service,
return a DTO. Engine errors (:class:`RepositoryError`) are translated to HTTP
409 (conflict) since they represent invalid VCS operations rather than server
faults.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from ..core import RepositoryError
from ..dto import (
    BranchRequest,
    CommitRequest,
    MergeRequest,
    StageRequest,
)
from .dependencies import (
    AnalyticsServiceDep,
    GraphServiceDep,
    InsightServiceDep,
    RepoServiceDep,
)

router = APIRouter(prefix="/api/repos/{name}", tags=["repository"])


def _guard(fn):
    """Run a service call, mapping engine errors to HTTP 409."""
    try:
        return fn()
    except RepositoryError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


# --------------------------------------------------------------------------- #
# graph & history
# --------------------------------------------------------------------------- #
@router.get("/graph")
def get_graph(svc: GraphServiceDep, insights: InsightServiceDep):
    avg = None
    return svc.build_graph(insight_fn=lambda info: insights.commit_insights(info, avg))


@router.get("/log")
def get_log(svc: RepoServiceDep, branch: Optional[str] = None):
    return svc.log(branch=branch)


@router.get("/branches")
def get_branches(svc: RepoServiceDep):
    return svc.branches()


@router.get("/status")
def get_status(svc: RepoServiceDep):
    return svc.status()


# --------------------------------------------------------------------------- #
# inspection
# --------------------------------------------------------------------------- #
@router.get("/commits/{commit_id}")
def inspect_commit(commit_id: str, svc: RepoServiceDep, insights: InsightServiceDep):
    def run():
        info = svc._repo.get_commit(commit_id)  # noqa: SLF001 (service-owned repo)
        return svc.inspect_commit(commit_id, insights=insights.commit_insights(info))

    return _guard(run)


@router.get("/diff")
def get_diff(svc: RepoServiceDep, new: str, old: Optional[str] = None):
    return _guard(lambda: svc.diff(old, new))


@router.get("/files/history")
def file_history(svc: RepoServiceDep, path: str):
    return svc.file_history(path)


# --------------------------------------------------------------------------- #
# analytics
# --------------------------------------------------------------------------- #
@router.get("/analytics")
def analytics(svc: AnalyticsServiceDep):
    return svc.overview()


@router.get("/insights")
def insights(svc: InsightServiceDep):
    return svc.repo_insights()


# --------------------------------------------------------------------------- #
# mutations
# --------------------------------------------------------------------------- #
@router.post("/stage")
def stage(body: StageRequest, svc: RepoServiceDep):
    svc.stage(body.path, body.content)
    return {"ok": True}


@router.post("/commit")
def commit(body: CommitRequest, svc: RepoServiceDep):
    return _guard(lambda: svc.commit(body.message, body.author))


@router.post("/branches")
def create_branch(body: BranchRequest, svc: RepoServiceDep):
    _guard(lambda: svc.create_branch(body.name, at=body.at))
    return {"ok": True}


@router.post("/checkout")
def checkout(body: BranchRequest, svc: RepoServiceDep):
    _guard(lambda: svc.checkout(body.name))
    return {"ok": True}


@router.post("/merge")
def merge(body: MergeRequest, svc: RepoServiceDep):
    return _guard(lambda: svc.merge(body.branch, body.author))
