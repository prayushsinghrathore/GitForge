"""Shared pytest fixtures for the engine test-suite."""

from __future__ import annotations

import itertools
from pathlib import Path

import pytest

from app.core import Repository


@pytest.fixture
def repo(tmp_path: Path) -> Repository:
    """A fresh, isolated repository backed by a temp SQLite file."""
    return Repository.init(tmp_path / "repo.gitforge")


@pytest.fixture
def clock():
    """A monotonically increasing timestamp source for deterministic commits."""
    counter = itertools.count(1_700_000_000, step=60)
    return lambda: next(counter)
