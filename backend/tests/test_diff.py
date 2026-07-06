"""LCS line diff behaviour."""

from __future__ import annotations

from app.core.diff import LineOp, diff_text


def _ops(diff):
    return [(l.op, l.text) for l in diff.lines]


def test_no_change_yields_all_equal():
    d = diff_text("a\nb\nc", "a\nb\nc")
    assert all(l.op is LineOp.EQUAL for l in d.lines)
    assert d.insertions == 0 and d.deletions == 0


def test_pure_insertion():
    d = diff_text("a\nc", "a\nb\nc")
    assert (LineOp.ADD, "b") in _ops(d)
    assert d.insertions == 1 and d.deletions == 0


def test_pure_deletion():
    d = diff_text("a\nb\nc", "a\nc")
    assert (LineOp.REMOVE, "b") in _ops(d)
    assert d.deletions == 1 and d.insertions == 0


def test_modification_is_remove_then_add():
    d = diff_text("a\nb\nc", "a\nB\nc")
    ops = _ops(d)
    assert (LineOp.REMOVE, "b") in ops
    assert (LineOp.ADD, "B") in ops


def test_line_numbers_are_tracked_per_side():
    d = diff_text("x\ny", "x\nz\ny")
    added = [l for l in d.lines if l.op is LineOp.ADD][0]
    assert added.new_lineno == 2 and added.old_lineno is None


def test_from_empty_is_all_additions():
    d = diff_text("", "a\nb")
    assert d.insertions == 2 and d.deletions == 0
