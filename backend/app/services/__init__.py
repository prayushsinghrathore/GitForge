"""Service layer: orchestrates the engine and maps results into DTOs.

Routers stay thin — they parse requests and delegate here. Services hold no
persistent state of their own; they operate on a :class:`Repository` handed in
by the dependency-injection layer.
"""

from .graph_service import GraphService
from .repo_service import RepoService
from .analytics_service import AnalyticsService
from .insight_service import InsightService

__all__ = ["GraphService", "RepoService", "AnalyticsService", "InsightService"]
