"""Repository operations mapped to DTOs (staging, commit, branch, diff, ...)."""

from __future__ import annotations

import time
from typing import Optional

from ..core import Repository, RepositoryError
from ..core.dag import ancestors
from ..core.repository import CommitInfo
from ..dto import (
    BranchDTO,
    CommitDTO,
    CommitInspectorDTO,
    DiffFileDTO,
    DiffLineDTO,
    FileHistoryDTO,
    StatusDTO,
)


def commit_to_dto(info: CommitInfo) -> CommitDTO:
    return CommitDTO(
        id=info.id,
        short=info.id[:8],
        parents=list(info.parents),
        author=info.author,
        message=info.message,
        timestamp=info.timestamp,
        is_merge=info.is_merge,
        files_changed=info.files_changed,
        insertions=info.insertions,
        deletions=info.deletions,
    )


class RepoService:
    def __init__(self, repo: Repository) -> None:
        self._repo = repo

    # -- staging & commit --------------------------------------------------- #
    def stage(self, path: str, content: str) -> None:
        self._repo.stage_file(path, content.encode("utf-8"))

    def commit(self, message: str, author: str) -> CommitDTO:
        cid = self._repo.commit(
            message=message, author=author, timestamp=int(time.time())
        )
        return commit_to_dto(self._repo.get_commit(cid))

    def status(self) -> StatusDTO:
        raw = self._repo.status()
        return StatusDTO(branch=self._repo.refs.head_branch(), **raw)

    # -- history ------------------------------------------------------------ #
    def log(self, branch: Optional[str] = None) -> list[CommitDTO]:
        return [commit_to_dto(c) for c in self._repo.log(branch=branch)]

    def branches(self) -> list[BranchDTO]:
        current = self._repo.refs.head_branch()
        out: list[BranchDTO] = []
        for name, tip in self._repo.refs.list_branches().items():
            count = 0
            last = None
            if tip:
                reachable = ancestors(tip, self._repo.objects.get_commit)
                count = len(reachable)
                last = self._repo.get_commit(tip).timestamp
            out.append(
                BranchDTO(
                    name=name,
                    tip=tip,
                    short_tip=tip[:8] if tip else None,
                    is_current=name == current,
                    commit_count=count,
                    last_activity=last,
                )
            )
        return out

    def create_branch(self, name: str, at: Optional[str] = None) -> None:
        self._repo.create_branch(name, at=at)

    def checkout(self, branch: str) -> None:
        self._repo.checkout(branch)

    def merge(self, branch: str, author: str) -> CommitDTO:
        cid = self._repo.merge(branch, author=author, timestamp=int(time.time()))
        return commit_to_dto(self._repo.get_commit(cid))

    # -- inspection --------------------------------------------------------- #
    def inspect_commit(self, commit_id: str, insights: list[str] | None = None) -> CommitInspectorDTO:
        info = self._repo.get_commit(commit_id)
        parent = info.parents[0] if info.parents else None
        diffs = self._repo.diff_commits(parent, commit_id)
        files = [self._diff_to_dto(path, fd) for path, fd in diffs.items()]
        return CommitInspectorDTO(
            commit=commit_to_dto(info), files=files, insights=insights or []
        )

    def diff(self, old: Optional[str], new: str) -> list[DiffFileDTO]:
        diffs = self._repo.diff_commits(old, new)
        return [self._diff_to_dto(path, fd) for path, fd in diffs.items()]

    def file_history(self, path: str) -> FileHistoryDTO:
        commits = [commit_to_dto(c) for c in self._repo.file_history(path)]
        return FileHistoryDTO(path=path, commits=commits)

    def restore(self, path: str, commit_id: Optional[str]) -> None:
        self._repo.restore_file(path, commit_id=commit_id)

    @staticmethod
    def _diff_to_dto(path: str, filediff) -> DiffFileDTO:
        return DiffFileDTO(
            path=path,
            insertions=filediff.insertions,
            deletions=filediff.deletions,
            lines=[
                DiffLineDTO(
                    op=line.op.value,
                    old_lineno=line.old_lineno,
                    new_lineno=line.new_lineno,
                    text=line.text,
                )
                for line in filediff.lines
            ],
        )
