"""Tests for the blame annotation engine (via RepoService)."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.services.repo_service import RepoService


def test_blame_single_line_stays_at_first_commit(repo, clock):
    """A line that never changes stays attributed to the introducing commit."""
    repo.stage_file("hello.txt", b"hello\nworld\n")
    c1 = repo.commit("first", "Alice", clock())
    repo.stage_file("hello.txt", b"hello\nworld\n")
    repo.commit("identical", "Alice", clock())

    result = RepoService(repo).blame("hello.txt")
    assert len(result.lines) == 2
    assert result.lines[0].commit_id == c1
    assert result.lines[1].commit_id == c1


def test_blame_modified_line_moves_to_newer_commit(repo, clock):
    """A line changed in a later commit is attributed to that later commit."""
    repo.stage_file("test.txt", b"aaa\nbbb\nccc\n")
    c1 = repo.commit("first", "Alice", clock())

    repo.stage_file("test.txt", b"aaa\nbbb MODIFIED\nccc\n")
    c2 = repo.commit("modified b", "Alice", clock())

    result = RepoService(repo).blame("test.txt")
    assert len(result.lines) == 3
    assert result.lines[0].commit_id == c1  # aaa unchanged
    assert result.lines[1].commit_id == c2  # bbb MODIFIED
    assert result.lines[2].commit_id == c1  # ccc unchanged


def test_blame_new_line_at_end(repo, clock):
    """Appending a line blames it to the adding commit."""
    repo.stage_file("test.txt", b"line1\nline2\n")
    c1 = repo.commit("first", "Alice", clock())

    repo.stage_file("test.txt", b"line1\nline2\nline3\n")
    c2 = repo.commit("added line3", "Alice", clock())

    result = RepoService(repo).blame("test.txt")
    assert len(result.lines) == 3
    assert result.lines[0].commit_id == c1
    assert result.lines[1].commit_id == c1
    assert result.lines[2].commit_id == c2


def test_blame_deleted_lines_are_skipped(repo, clock):
    """Deleted lines do not appear; surviving lines trace to the earlier commit."""
    repo.stage_file("test.txt", b"keep\nremove\nkeep2\n")
    c1 = repo.commit("first", "Alice", clock())

    repo.stage_file("test.txt", b"keep\nkeep2\n")
    c2 = repo.commit("removed middle", "Alice", clock())

    result = RepoService(repo).blame("test.txt")
    assert len(result.lines) == 2
    # Both lines existed in c1, so blame traces back to c1
    assert result.lines[0].commit_id == c1
    assert result.lines[1].commit_id == c1


def test_blame_returns_dto_with_enriched_metadata(repo, clock):
    """Each BlameLineDTO carries author, timestamp, message."""
    repo.stage_file("data.txt", b"content\n")
    cid = repo.commit("initial commit", "Bob", clock())
    result = RepoService(repo).blame("data.txt")
    assert len(result.lines) == 1
    line = result.lines[0]
    assert line.commit_id == cid
    assert line.short_id == cid[:8]
    assert line.author == "Bob"
    assert line.timestamp > 1_600_000_000
    assert line.message == "initial commit"
    assert line.lineno == 1
    assert line.content == "content"


def test_blame_nonexistent_file_returns_empty(repo, clock):
    """Blame on a path that was never committed returns zero lines."""
    result = RepoService(repo).blame("nope.txt")
    assert len(result.lines) == 0
