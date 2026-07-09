"""Heuristic "developer insights" — the deliberately-not-AI insight layer.

The spec is explicit that AI is *not* the core feature; insights are supporting
signal. So rather than call a model, this service derives insights from cheap,
explainable statistics over the commit graph. Each rule is a pure function of
repository state, which keeps them deterministic and testable:

    * unusually large commit (relative to the repo's own average)
    * touches sensitive areas (auth/security/secrets/config)
    * high-risk merge (large merge commit)
    * stale branch (inactive for many days)
    * possible refactor (many files, balanced insert/delete)

The output is short, human strings like GitLens annotations — never prose.
"""

from __future__ import annotations

from statistics import mean
from typing import Optional

from ..core import Repository
from ..core.repository import CommitInfo
from ..dto import InsightDTO

SENSITIVE_HINTS = ("auth", "login", "password", "secret", "token", "cred", "security")
CONFIG_HINTS = ("config", ".env", "settings", "dockerfile", "ci", "deploy")
STALE_DAYS = 14


class InsightService:
    def __init__(self, repo: Repository) -> None:
        self._repo = repo

    # -- per-commit --------------------------------------------------------- #
    def commit_insights(self, info: CommitInfo, avg_size: Optional[float] = None) -> list[str]:
        out: list[str] = []
        avg = avg_size if avg_size is not None else self._average_commit_size()
        size = info.insertions + info.deletions

        if avg > 0 and size > max(3 * avg, 50):
            out.append(f"This commit is unusually large (+{info.insertions}/-{info.deletions}).")

        try:
            paths = self._changed_paths(info)
        except KeyError:
            paths = []
        if any(any(h in p.lower() for h in SENSITIVE_HINTS) for p in paths):
            out.append("Modifies authentication/security-related files.")
        if any(any(h in p.lower() for h in CONFIG_HINTS) for p in paths):
            out.append("Touches configuration or deployment files.")

        if info.is_merge and size > max(2 * avg, 30):
            out.append("High-risk merge: large surface area of changes.")

        if (
            info.files_changed >= 4
            and info.deletions > 0
            and 0.5 <= info.insertions / max(info.deletions, 1) <= 2.0
        ):
            out.append("Possible refactoring: balanced additions and deletions across files.")

        return out

    # -- repository-wide ---------------------------------------------------- #
    def repo_insights(self) -> list[InsightDTO]:
        out: list[InsightDTO] = []
        now = self._now()

        # Stale branches
        for name, tip in self._repo.refs.list_branches().items():
            if not tip:
                continue
            last = self._repo.get_commit(tip).timestamp
            days = (now - last) / 86400
            if days >= STALE_DAYS:
                out.append(
                    InsightDTO(
                        kind="warning",
                        title=f"Branch '{name}' looks stale",
                        detail=f"No activity for {int(days)} days.",
                        commit_id=tip,
                    )
                )

        # Largest commit callout
        history = self._repo.log()
        if history:
            biggest = max(history, key=lambda c: c.insertions + c.deletions)
            if biggest.insertions + biggest.deletions > 0:
                out.append(
                    InsightDTO(
                        kind="info",
                        title="Largest commit",
                        detail=(
                            f"'{biggest.message.splitlines()[0]}' changed "
                            f"{biggest.files_changed} files "
                            f"(+{biggest.insertions}/-{biggest.deletions})."
                        ),
                        commit_id=biggest.id,
                    )
                )

        # Risky merges
        for c in history:
            if c.is_merge and (c.insertions + c.deletions) > 0:
                out.append(
                    InsightDTO(
                        kind="risk",
                        title="Merge commit",
                        detail=f"'{c.message.splitlines()[0]}' merged divergent history.",
                        commit_id=c.id,
                    )
                )
        return out

    # -- helpers ------------------------------------------------------------ #
    def _average_commit_size(self) -> float:
        history = self._repo.log()
        sizes = [c.insertions + c.deletions for c in history]
        return mean(sizes) if sizes else 0.0

    def _changed_paths(self, info: CommitInfo) -> list[str]:
        parent = info.parents[0] if info.parents else None
        return list(self._repo.diff_commits(parent, info.id).keys())

    def _now(self) -> int:
        # Use the newest commit as "now" when available so insights are stable
        # in tests and offline demos; fall back to wall clock otherwise.
        history = self._repo.log()
        if history:
            return max(c.timestamp for c in history)
        import time

        return int(time.time())
