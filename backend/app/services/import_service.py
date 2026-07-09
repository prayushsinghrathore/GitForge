"""Import a real Git repository into the GitForge engine.

This module clones a GitHub repository via ``git clone --bare``, iterates its
commits in topological order (oldest → newest), and replays each snapshot into a
new :class:`Repository`.  The import preserves authorship, timestamps, and
messages — the commit DAG is linear for now (a future enhancement can
reconstruct merge topology).

All I/O (clone, rev-list, ls-tree, show) goes through the ``git`` CLI; the
resulting object conversion is engine-native.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from ..repositories import RepositoryProvider

# Supported URL patterns.
_GITHUB_HTTPS = re.compile(
    r"^https://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$"
)
_GITHUB_SSH = re.compile(
    r"^git@github\.com:([^/]+)/([^/]+?)(?:\.git)?/?$"
)


def _extract_repo_name(url: str) -> str:
    """Extract a safe repository name from a GitHub URL."""
    for pattern in (_GITHUB_HTTPS, _GITHUB_SSH):
        m = pattern.match(url)
        if m:
            return f"{m.group(1)}_{m.group(2)}"
    raise ValueError(
        "URL must be a valid GitHub repository URL "
        "(e.g. https://github.com/owner/repo)"
    )


def _fast_import_url(url: str) -> str:
    """Normalise the URL to a cloneable form."""
    m = _GITHUB_HTTPS.match(url)
    if m:
        return f"https://github.com/{m.group(1)}/{m.group(2)}.git"
    m = _GITHUB_SSH.match(url)
    if m:
        return f"git@github.com:{m.group(1)}/{m.group(2)}.git"
    return url


def import_github(
    url: str,
    provider: RepositoryProvider,
    *,
    name: Optional[str] = None,
) -> tuple[str, int]:
    """Clone a GitHub repository and import its history into GitForge.

    Returns
    -------
    ``(repo_name, commit_count)``
    """
    repo_name = name or _extract_repo_name(url)
    clone_url = _fast_import_url(url)

    tmpdir = Path(tempfile.mkdtemp(prefix="gitforge-import-"))
    git_dir = tmpdir / "bare.git"

    try:
        subprocess.run(
            ["git", "clone", "--bare", clone_url, str(git_dir)],
            capture_output=True,
            check=True,
            timeout=300,
        )
        return _import_from_bare(git_dir, repo_name, provider)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _import_from_bare(
    git_dir: Path,
    repo_name: str,
    provider: RepositoryProvider,
) -> tuple[str, int]:
    """Import all commits from a bare clone into a new GitForge repository."""
    # ------------------------------------------------------------------ #
    # 1. Discover commits (oldest-first topological order)
    # ------------------------------------------------------------------ #
    rev_list = subprocess.run(
        ["git", "--git-dir", str(git_dir),
         "rev-list", "--topo-order", "--reverse", "--all"],
        capture_output=True, text=True, check=True, timeout=120,
    )
    sha_list = [s for s in rev_list.stdout.strip().splitlines() if s]
    if not sha_list:
        raise ValueError("No commits found in repository")

    # ------------------------------------------------------------------ #
    # 2. Discover branches (refs/heads -> Git SHA)
    # ------------------------------------------------------------------ #
    branches: dict[str, str] = {}
    for_each = subprocess.run(
        ["git", "--git-dir", str(git_dir), "for-each-ref",
         "--format=%(refname:short)%00%(objectname)", "refs/heads"],
        capture_output=True, text=True, check=True, timeout=30,
    )
    for line in for_each.stdout.strip().splitlines():
        if "\x00" in line:
            bname, bsha = line.split("\x00", 1)
            branches[bname] = bsha

    # Detect the original HEAD branch.
    head_branch = (
        subprocess.run(
            ["git", "--git-dir", str(git_dir), "symbolic-ref",
             "--short", "HEAD"],
            capture_output=True, text=True, timeout=15,
        ).stdout.strip()
        or "main"
    )

    # ------------------------------------------------------------------ #
    # 3. Create the GitForge repository & replay commits
    # ------------------------------------------------------------------ #
    repo = provider.create(repo_name)
    # Map from Git SHA -> GitForge commit id (captured as we go).
    sha_map: dict[str, str] = {}

    imported = 0
    for sha in sha_list:
        _import_commit(repo, git_dir, sha)
        imported += 1
        tip = repo.refs.head_commit()
        if tip:
            sha_map[sha] = tip

    # ------------------------------------------------------------------ #
    # 4. Set up branches in GitForge
    # ------------------------------------------------------------------ #
    for bname, bsha in branches.items():
        if bsha in sha_map:
            repo.refs.create_branch(bname, sha_map[bsha])

    # Switch HEAD to the imported repo's default branch.
    if repo.refs.branch_exists(head_branch):
        repo.checkout(head_branch)

    return repo_name, imported


def _import_commit(repo, git_dir: Path, sha: str) -> None:
    """Stage and commit a single Git snapshot into the GitForge repository."""
    # -- author & message -------------------------------------------------- #
    log_info = subprocess.run(
        ["git", "--git-dir", str(git_dir), "log", "-1",
         "--format=%an <%ae>%x00%at%x00%B", sha],
        capture_output=True, text=True, check=True, timeout=30,
    )
    parts = log_info.stdout.strip().split("\x00", 2)
    author = parts[0]
    timestamp = int(parts[1]) if len(parts) > 1 else 0
    message = parts[2] if len(parts) > 2 else ""

    # -- file listing (null-terminated for path safety) -------------------- #
    ls_tree = subprocess.run(
        ["git", "--git-dir", str(git_dir), "ls-tree", "-r", "-z", sha],
        capture_output=True, check=True, timeout=30,
    )
    paths: list[str] = []
    for entry in ls_tree.stdout.rstrip(b"\x00").split(b"\x00"):
        if not entry:
            continue
        try:
            path_part = entry.split(b"\t", 1)[1]
            paths.append(path_part.decode("utf-8", "replace"))
        except (ValueError, IndexError):
            continue

    # -- stage & commit ---------------------------------------------------- #
    for file_path in paths:
        blob = subprocess.run(
            ["git", "--git-dir", str(git_dir), "show", f"{sha}:{file_path}"],
            capture_output=True, timeout=30,
        )
        repo.stage_file(file_path, blob.stdout)

    repo.commit(message=message, author=author, timestamp=timestamp)
