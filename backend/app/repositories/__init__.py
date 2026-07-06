"""Persistence boundary (Repository Pattern).

The API works against a *named* set of GitForge repositories on disk. This
package owns where those live and how a :class:`~app.core.Repository` handle is
obtained for a given name, so the rest of the app never touches file paths or
SQLite directly. Swapping the storage location (or backing store) is a change
confined to this one module.
"""

from .repo_provider import RepositoryProvider

__all__ = ["RepositoryProvider"]
