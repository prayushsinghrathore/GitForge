"""Three-way merge: auto-resolution and conflict detection."""

from __future__ import annotations

from app.core import three_way_merge


def b(text: str) -> bytes:
    return text.encode("utf-8")


def test_non_overlapping_change_takes_the_changed_side():
    base = {"a.txt": b("hello")}
    ours = {"a.txt": b("hello")}
    theirs = {"a.txt": b("hello world")}
    result = three_way_merge(base, ours, theirs)
    assert result.clean
    assert result.files["a.txt"] == b("hello world")


def test_add_on_one_side_only():
    base: dict[str, bytes] = {}
    ours = {"new.txt": b("content")}
    theirs: dict[str, bytes] = {}
    result = three_way_merge(base, ours, theirs)
    assert result.clean
    assert result.files["new.txt"] == b("content")


def test_identical_change_on_both_sides_is_clean():
    base = {"a.txt": b("x")}
    ours = {"a.txt": b("y")}
    theirs = {"a.txt": b("y")}
    result = three_way_merge(base, ours, theirs)
    assert result.clean
    assert result.files["a.txt"] == b("y")


def test_conflicting_edits_produce_conflict_markers():
    base = {"a.txt": b("line1\nline2\nline3")}
    ours = {"a.txt": b("line1\nOURS\nline3")}
    theirs = {"a.txt": b("line1\nTHEIRS\nline3")}
    result = three_way_merge(base, ours, theirs)
    assert not result.clean
    assert "a.txt" in result.conflicts
    merged = result.files["a.txt"].decode()
    assert "<<<<<<< ours" in merged and ">>>>>>> theirs" in merged


def test_delete_on_one_side_unchanged_on_other_stays_deleted():
    base = {"a.txt": b("keep")}
    ours: dict[str, bytes] = {}  # deleted by us
    theirs = {"a.txt": b("keep")}  # untouched
    result = three_way_merge(base, ours, theirs)
    assert result.clean
    assert "a.txt" not in result.files


def test_delete_vs_modify_is_a_conflict():
    base = {"a.txt": b("original")}
    ours: dict[str, bytes] = {}  # deleted by us
    theirs = {"a.txt": b("modified")}  # changed by them
    result = three_way_merge(base, ours, theirs)
    assert not result.clean
    assert "a.txt" in result.conflicts
