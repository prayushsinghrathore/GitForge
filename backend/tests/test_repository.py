"""End-to-end repository workflows over the composed engine.

These exercise the full stack — object store, refs, index, tree building, diff,
DAG and merge — through the public :class:`Repository` facade.
"""

from __future__ import annotations

import pytest

from app.core import Repository, RepositoryError


def commit(repo, clock, files: dict[str, str], message: str, author="Ada Lovelace"):
    for path, content in files.items():
        repo.stage_file(path, content.encode("utf-8"))
    return repo.commit(message=message, author=author, timestamp=clock())


# --------------------------------------------------------------------------- #
# basic lifecycle
# --------------------------------------------------------------------------- #
def test_init_creates_unborn_main_branch(repo):
    assert repo.refs.head_branch() == "main"
    assert repo.refs.head_commit() is None
    assert repo.log() == []


def test_commit_creates_history(repo, clock):
    c1 = commit(repo, clock, {"readme.md": "hello"}, "init")
    c2 = commit(repo, clock, {"readme.md": "hello world"}, "update")
    history = repo.log()
    assert [c.id for c in history] == [c2, c1]
    assert history[0].parents == (c1,)


def test_commit_without_staging_raises(repo, clock):
    with pytest.raises(RepositoryError):
        repo.commit(message="empty", author="x", timestamp=clock())


def test_commit_records_stats(repo, clock):
    commit(repo, clock, {"a.txt": "line1\nline2"}, "first")
    c2 = commit(repo, clock, {"a.txt": "line1\nline2\nline3"}, "add a line")
    info = repo.get_commit(c2)
    assert info.files_changed == 1
    assert info.insertions == 1


def test_nested_paths_round_trip_through_trees(repo, clock):
    commit(repo, clock, {"src/app/main.py": "print(1)", "readme.md": "x"}, "nested")
    files = repo._commit_file_map(repo.refs.head_commit())
    assert files["src/app/main.py"] == b"print(1)"
    assert files["readme.md"] == b"x"


# --------------------------------------------------------------------------- #
# branching & checkout
# --------------------------------------------------------------------------- #
def test_branch_and_checkout_switches_snapshot(repo, clock):
    commit(repo, clock, {"a.txt": "main-1"}, "main commit")
    repo.create_branch("feature")
    repo.checkout("feature")
    commit(repo, clock, {"a.txt": "feature-1", "b.txt": "new"}, "feature commit")

    # feature has b.txt, main does not
    repo.checkout("main")
    assert repo.status()  # smoke
    main_files = repo._commit_blob_map(repo.refs.head_commit())
    assert "b.txt" not in main_files

    repo.checkout("feature")
    feat_files = repo._commit_blob_map(repo.refs.head_commit())
    assert "b.txt" in feat_files


def test_checkout_missing_branch_raises(repo):
    with pytest.raises(RepositoryError):
        repo.checkout("nope")


def test_duplicate_branch_raises(repo, clock):
    commit(repo, clock, {"a.txt": "1"}, "c")
    repo.create_branch("dup")
    with pytest.raises(RepositoryError):
        repo.create_branch("dup")


# --------------------------------------------------------------------------- #
# merging
# --------------------------------------------------------------------------- #
def test_fast_forward_merge(repo, clock):
    commit(repo, clock, {"a.txt": "base"}, "base")
    repo.create_branch("feature")
    repo.checkout("feature")
    fc = commit(repo, clock, {"a.txt": "base", "f.txt": "feature"}, "feature work")

    repo.checkout("main")
    merged = repo.merge("feature", author="Ada", timestamp=clock())
    assert merged == fc  # fast-forward: main now points at feature's tip
    assert not repo.get_commit(merged).is_merge


def test_three_way_merge_creates_merge_commit(repo, clock):
    commit(repo, clock, {"shared.txt": "base"}, "base")
    repo.create_branch("feature")

    # divergent work on main
    repo.checkout("main")
    commit(repo, clock, {"shared.txt": "base", "main_only.txt": "M"}, "main work")

    # divergent work on feature
    repo.checkout("feature")
    commit(repo, clock, {"shared.txt": "base", "feat_only.txt": "F"}, "feature work")

    repo.checkout("main")
    merged = repo.merge("feature", author="Ada", timestamp=clock())
    info = repo.get_commit(merged)
    assert info.is_merge
    assert len(info.parents) == 2

    files = repo._commit_blob_map(merged)
    assert {"shared.txt", "main_only.txt", "feat_only.txt"} <= set(files)


def test_conflicting_merge_raises(repo, clock):
    commit(repo, clock, {"c.txt": "l1\nl2\nl3"}, "base")
    repo.create_branch("feature")

    repo.checkout("main")
    commit(repo, clock, {"c.txt": "l1\nMAIN\nl3"}, "main edit")
    repo.checkout("feature")
    commit(repo, clock, {"c.txt": "l1\nFEATURE\nl3"}, "feature edit")

    repo.checkout("main")
    with pytest.raises(RepositoryError, match="conflict"):
        repo.merge("feature", author="Ada", timestamp=clock())


# --------------------------------------------------------------------------- #
# diff, restore, history
# --------------------------------------------------------------------------- #
def test_diff_between_commits(repo, clock):
    c1 = commit(repo, clock, {"a.txt": "one\ntwo"}, "first")
    c2 = commit(repo, clock, {"a.txt": "one\ntwo\nthree"}, "second")
    diffs = repo.diff_commits(c1, c2)
    assert "a.txt" in diffs
    assert diffs["a.txt"].insertions == 1


def test_restore_recovers_deleted_file(repo, clock):
    commit(repo, clock, {"keep.txt": "precious", "temp.txt": "junk"}, "first")
    # simulate deletion by staging a snapshot without temp.txt
    repo.index.clear()
    repo.stage_file("keep.txt", b"precious")
    repo.commit(message="delete temp", author="Ada", timestamp=clock())
    assert "temp.txt" not in repo.status()["staged_new"]

    # restore it from the first commit
    first = repo.log()[-1].id
    content = repo.restore_file("temp.txt", commit_id=first)
    assert content == b"junk"
    assert repo.index.get("temp.txt") is not None


def test_file_history_tracks_only_changing_commits(repo, clock):
    commit(repo, clock, {"a.txt": "v1", "b.txt": "x"}, "c1")
    commit(repo, clock, {"a.txt": "v1", "b.txt": "y"}, "c2")  # a.txt unchanged
    commit(repo, clock, {"a.txt": "v2", "b.txt": "y"}, "c3")  # a.txt changed
    history = repo.file_history("a.txt")
    messages = [c.message for c in history]
    assert messages == ["c3", "c1"]  # c2 didn't touch a.txt


def test_status_reports_new_and_modified(repo, clock):
    commit(repo, clock, {"a.txt": "one"}, "first")
    repo.stage_file("a.txt", b"one-modified")
    repo.stage_file("b.txt", b"brand new")
    status = repo.status()
    assert "b.txt" in status["staged_new"]
    assert "a.txt" in status["staged_modified"]


def test_persistence_across_reopen(repo, clock, tmp_path):
    # commit, then reopen the same DB and confirm history survives
    commit(repo, clock, {"a.txt": "durable"}, "persist me")
    original = [c.id for c in repo.log()]

    reopened = Repository.open(tmp_path / "repo.gitforge")
    assert [c.id for c in reopened.log()] == original
