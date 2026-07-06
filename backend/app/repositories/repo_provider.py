"""Resolves repository names to engine handles and seeds a demo repository.

A ``RepositoryProvider`` is the single place that knows the on-disk layout:

    <data_dir>/<name>.gitforge/store.db

It caches open handles per name so repeated API calls reuse one SQLite
connection. The provider also knows how to lazily create a rich **demo**
repository on first run, so the UI has an interesting graph to render without
the user having to script one by hand.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..core import Repository
from .seed import seed_demo_repository


class RepositoryProvider:
    def __init__(self, data_dir: Path) -> None:
        self._data_dir = Path(data_dir)
        self._data_dir.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, Repository] = {}

    def _db_path(self, name: str) -> Path:
        safe = name.replace("/", "_")
        return self._data_dir / f"{safe}.gitforge" / "store.db"

    def exists(self, name: str) -> bool:
        return self._db_path(name).exists()

    def get(self, name: str) -> Repository:
        if name not in self._cache:
            self._cache[name] = Repository.open(self._db_path(name))
        return self._cache[name]

    def create(self, name: str) -> Repository:
        repo = Repository.init(self._db_path(name))
        self._cache[name] = repo
        return repo

    def get_or_seed_demo(self, name: str = "demo") -> Repository:
        """Return the demo repo, generating its history on first access."""
        if not self.exists(name):
            repo = self.create(name)
            seed_demo_repository(repo)
            return repo
        return self.get(name)

    def list_names(self) -> list[str]:
        names = []
        for child in self._data_dir.glob("*.gitforge"):
            names.append(child.name[: -len(".gitforge")])
        return sorted(names)
