"""Deterministic demo history so the UI has a compelling graph on first launch.

The seed script drives the *public engine API* exactly as a user would — no
back doors — building a small project with a feature branch, a hotfix branch,
and a real three-way merge. Timestamps advance on a fixed synthetic clock so the
demo is byte-for-byte reproducible (and so insights like "stale branch" are
stable regardless of when the demo is generated).
"""

from __future__ import annotations

from ..core import Repository

# A fixed starting point (2025-01-06T09:00:00Z) and step so the seeded graph is
# reproducible and the heatmap spans several days.
_T0 = 1_736_154_000
_STEP = 6 * 3600  # six hours between commits


class _Clock:
    def __init__(self) -> None:
        self.t = _T0

    def tick(self, steps: int = 1) -> int:
        self.t += steps * _STEP
        return self.t


def seed_demo_repository(repo: Repository) -> None:
    clock = _Clock()

    def snapshot(files: dict[str, str], message: str, author: str) -> str:
        for path, content in files.items():
            repo.stage_file(path, content.encode("utf-8"))
        return repo.commit(message=message, author=author, timestamp=clock.tick())

    # --- mainline: project takes shape ---------------------------------- #
    snapshot(
        {
            "README.md": "# Orbit\nA tiny task scheduler.\n",
            "src/core.py": "def schedule(tasks):\n    return sorted(tasks)\n",
        },
        "Initial project scaffold",
        "Ada Lovelace",
    )
    snapshot(
        {
            "README.md": "# Orbit\nA tiny task scheduler.\n\n## Usage\nImport and call schedule().\n",
            "src/core.py": "def schedule(tasks):\n    return sorted(tasks)\n",
            "src/cli.py": "import sys\nfrom core import schedule\nprint(schedule(sys.argv[1:]))\n",
        },
        "Add CLI entrypoint and usage docs",
        "Grace Hopper",
    )

    # --- feature branch: authentication --------------------------------- #
    repo.create_branch("feature/auth")
    repo.checkout("feature/auth")
    snapshot(
        {
            "src/auth.py": (
                "def login(user, password):\n"
                "    # naive check for demo purposes\n"
                "    return bool(user) and bool(password)\n"
            ),
        },
        "Introduce authentication module",
        "Linus Torvalds",
    )
    snapshot(
        {
            "src/auth.py": (
                "SESSIONS = {}\n\n"
                "def login(user, password):\n"
                "    if not user or not password:\n"
                "        return None\n"
                "    token = f'{user}-token'\n"
                "    SESSIONS[token] = user\n"
                "    return token\n\n"
                "def logout(token):\n"
                "    SESSIONS.pop(token, None)\n"
            ),
        },
        "Add session tokens and logout",
        "Linus Torvalds",
    )

    # --- hotfix branch off main in parallel ----------------------------- #
    repo.checkout("main")
    repo.create_branch("hotfix/sort")
    repo.checkout("hotfix/sort")
    snapshot(
        {
            "src/core.py": (
                "def schedule(tasks, reverse=False):\n"
                "    return sorted(tasks, reverse=reverse)\n"
            ),
        },
        "Fix: allow reverse scheduling order",
        "Ada Lovelace",
    )

    # merge hotfix back into main (fast-forward or 3-way)
    repo.checkout("main")
    repo.merge("hotfix/sort", author="Ada Lovelace", timestamp=clock.tick())

    # continue on main
    snapshot(
        {
            "CHANGELOG.md": "## Unreleased\n- reverse scheduling\n",
            "src/core.py": (
                "def schedule(tasks, reverse=False):\n"
                "    return sorted(tasks, reverse=reverse)\n"
            ),
        },
        "Start changelog",
        "Grace Hopper",
    )

    # --- merge the feature branch into main (true 3-way merge) ---------- #
    repo.merge("feature/auth", author="Ada Lovelace", timestamp=clock.tick())

    # a final polish commit on main
    snapshot(
        {
            "README.md": (
                "# Orbit\nA tiny task scheduler.\n\n"
                "## Usage\nImport and call schedule().\n\n"
                "## Auth\nUse login()/logout() for sessions.\n"
            ),
        },
        "Document authentication in README",
        "Ada Lovelace",
    )

    repo.checkout("main")
