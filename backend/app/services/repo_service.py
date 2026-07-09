"""Repository operations mapped to DTOs (staging, commit, branch, diff, ...)."""

from __future__ import annotations

import time
from typing import Optional

from ..core import Repository
from ..core.dag import ancestors
from ..core.diff import LineOp
from ..core.repository import CommitInfo
from ..dto import (
    BlameFileDTO,
    BlameLineDTO,
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

    def blame(self, path: str) -> BlameFileDTO:
        """Annotate each line of the current file with the commit that last changed it."""
        commits = self._repo.file_history(path)
        if not commits:
            return BlameFileDTO(path=path, lines=[])

        head_file = self._repo.file_content(path, commits[0].id)
        if head_file is None:
            return BlameFileDTO(path=path, lines=[])

        head_lines = head_file.decode("utf-8", "replace").splitlines()
        # blame_owner[i] = commit id that introduced line i (0-indexed)
        blame_owner = [commits[0].id] * len(head_lines)

        # Walk backwards through history, diffing consecutive pairs.
        # Lines that are EQUAL existed in the older commit → push blame back.
        # Lines that are ADD were introduced by the newer commit → keep blame.
        for idx in range(1, len(commits)):
            older_id = commits[idx].id
            newer_id = commits[idx - 1].id

            diffs = self._repo.diff_commits(older_id, newer_id)
            if path not in diffs:
                continue

            new_idx = 0  # 0-indexed position in the newer file
            for dline in diffs[path].lines:
                if dline.op is LineOp.EQUAL:
                    if new_idx < len(blame_owner):
                        blame_owner[new_idx] = older_id
                    new_idx += 1
                elif dline.op is LineOp.ADD:
                    new_idx += 1
                # REMOVE lines don't appear in the newer file — skip.

        enriched = [
            BlameLineDTO(
                lineno=i + 1,
                content=text,
                commit_id=cid,
                short_id=cid[:8],
                author=self._repo.get_commit(cid).author,
                timestamp=self._repo.get_commit(cid).timestamp,
                message=self._repo.get_commit(cid).message.splitlines()[0],
            )
            for i, (cid, text) in enumerate(zip(blame_owner, head_lines))
        ]
        return BlameFileDTO(path=path, lines=enriched)

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
