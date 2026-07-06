"""Dependency-injection wiring for the API.

FastAPI's ``Depends`` is used as a lightweight DI container. A single
:class:`RepositoryProvider` is created at startup and stored on ``app.state``;
per-request dependencies resolve the requested repository and construct the
service objects around it. Services are cheap and stateless, so building them
per request keeps the graph of dependencies explicit and thread-safe.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

from fastapi import Depends, HTTPException, Request

from ..core import Repository
from ..repositories import RepositoryProvider
from ..services import AnalyticsService, GraphService, InsightService, RepoService

DATA_DIR = Path(os.environ.get("GITFORGE_DATA", Path.home() / ".gitforge-data"))


def get_provider(request: Request) -> RepositoryProvider:
    provider: RepositoryProvider = request.app.state.provider
    return provider


def get_repository(
    name: str,
    provider: Annotated[RepositoryProvider, Depends(get_provider)],
) -> Repository:
    # The bundled "demo" repo is materialized on first access; others must exist.
    if name == "demo":
        return provider.get_or_seed_demo()
    if not provider.exists(name):
        raise HTTPException(status_code=404, detail=f"repository {name!r} not found")
    return provider.get(name)


RepoDep = Annotated[Repository, Depends(get_repository)]


def get_repo_service(repo: RepoDep) -> RepoService:
    return RepoService(repo)


def get_graph_service(repo: RepoDep) -> GraphService:
    return GraphService(repo)


def get_insight_service(repo: RepoDep) -> InsightService:
    return InsightService(repo)


def get_analytics_service(repo: RepoDep) -> AnalyticsService:
    return AnalyticsService(repo)


RepoServiceDep = Annotated[RepoService, Depends(get_repo_service)]
GraphServiceDep = Annotated[GraphService, Depends(get_graph_service)]
InsightServiceDep = Annotated[InsightService, Depends(get_insight_service)]
AnalyticsServiceDep = Annotated[AnalyticsService, Depends(get_analytics_service)]
