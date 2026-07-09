"""Repository analytics — the numbers behind the insights dashboard.

Everything here is derived on demand from the commit graph and object store:
contributor breakdown, a day-by-day activity heatmap, the most-churned files,
and the largest commits. Keeping analytics in their own service (rather than the
router) means the same computations back both the API and any future CLI report.
"""

from __future__ import annotations

import time
from collections import Counter, defaultdict
from typing import Optional

from ..core import Repository
from ..dto import RepoOverviewDTO
from .insight_service import InsightService
from .repo_service import commit_to_dto


class AnalyticsService:
    def __init__(self, repo: Repository, insights: Optional[InsightService] = None) -> None:
        self._repo = repo
        self._insights = insights or InsightService(repo)

    def overview(self) -> RepoOverviewDTO:
        history = self._repo.log()  # newest -> oldest
        branches = self._repo.refs.list_branches()

        commits_per_author: Counter[str] = Counter(c.author for c in history)
        activity_by_day: dict[str, int] = defaultdict(int)
        file_churn: Counter[str] = Counter()

        for c in history:
            day = time.strftime("%Y-%m-%d", time.gmtime(c.timestamp))
            activity_by_day[day] += 1
            parent = c.parents[0] if c.parents else None
            for path in self._repo.diff_commits(parent, c.id):
                file_churn[path] += 1

        largest = sorted(
            history, key=lambda c: c.insertions + c.deletions, reverse=True
        )[:5]

        return RepoOverviewDTO(
            commit_count=len(history),
            branch_count=len(branches),
            current_branch=self._repo.refs.head_branch(),
            object_count=self._repo.objects.count(),
            repository_size_bytes=self._repo.objects.total_size(),
            contributor_count=len(commits_per_author),
            last_commit=commit_to_dto(history[0]) if history else None,
            commits_per_author=dict(commits_per_author),
            activity_by_day=dict(sorted(activity_by_day.items())),
            most_changed_files=[
                {"path": path, "changes": n} for path, n in file_churn.most_common(10)
            ],
            largest_commits=[commit_to_dto(c) for c in largest],
            insights=self._insights.repo_insights(),
        )
