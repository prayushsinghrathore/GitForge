"""``gitforge`` — a command-line front end for the VCS engine.

This is a thin adapter: it maps real files in a working directory to the
engine's ``path -> bytes`` model and renders engine results for humans. All
version-control semantics live in :mod:`app.core`; the CLI only does I/O and
formatting. The same core powers the FastAPI service, which is the point of
keeping the engine framework-free.

Repository metadata lives in a ``.gitforge/`` directory at the working-tree
root (a single SQLite file), analogous to Git's ``.git``.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from app.core import Repository, RepositoryError
from app.core.diff import LineOp

META_DIR = ".gitforge"
DB_NAME = "store.db"

# ANSI colors for a premium terminal feel (degrade gracefully if piped).
_C = {
    "reset": "\033[0m", "dim": "\033[2m", "bold": "\033[1m",
    "green": "\033[32m", "red": "\033[31m", "yellow": "\033[33m",
    "cyan": "\033[36m", "magenta": "\033[35m",
}


def _color(text: str, name: str) -> str:
    if not sys.stdout.isatty():
        return text
    return f"{_C[name]}{text}{_C['reset']}"


# --------------------------------------------------------------------------- #
# working-tree <-> engine bridging
# --------------------------------------------------------------------------- #
def _find_root(start: Path) -> Path | None:
    for parent in [start, *start.parents]:
        if (parent / META_DIR).is_dir():
            return parent
    return None


def _require_repo() -> tuple[Repository, Path]:
    root = _find_root(Path.cwd())
    if root is None:
        _die("not a GitForge repository (run `gitforge init`)")
    return Repository.open(root / META_DIR / DB_NAME), root


def _iter_working_files(root: Path):
    """Yield repo-relative POSIX paths for all files, skipping metadata/VCS dirs."""
    skip = {META_DIR, ".git", "__pycache__", "node_modules", ".venv"}
    for path in sorted(root.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(root)
        if any(part in skip for part in rel.parts):
            continue
        yield rel.as_posix(), path


def _die(message: str) -> "None":
    print(_color(f"error: {message}", "red"), file=sys.stderr)
    raise SystemExit(1)


# --------------------------------------------------------------------------- #
# commands
# --------------------------------------------------------------------------- #
def cmd_init(args) -> None:
    root = Path.cwd()
    if (root / META_DIR).exists():
        _die("repository already initialized here")
    Repository.init(root / META_DIR / DB_NAME, default_branch=args.branch)
    print(f"Initialized empty GitForge repository in {root / META_DIR}")
    print(f"  {_color('on branch', 'dim')} {_color(args.branch, 'cyan')}")


def cmd_add(args) -> None:
    repo, root = _require_repo()
    targets = args.paths or ["."]
    staged = 0
    for target in targets:
        tpath = (root / target).resolve()
        if tpath.is_dir() or target == ".":
            base = root if target == "." else tpath
            for rel, fpath in _iter_working_files(base):
                repo.stage_file(rel, fpath.read_bytes())
                staged += 1
        elif tpath.is_file():
            rel = tpath.relative_to(root).as_posix()
            repo.stage_file(rel, tpath.read_bytes())
            staged += 1
        else:
            _die(f"pathspec {target!r} did not match any files")
    print(f"Staged {staged} file(s).")


def cmd_status(args) -> None:
    repo, _ = _require_repo()
    branch = repo.refs.head_branch()
    print(f"On branch {_color(branch or '(none)', 'cyan')}")
    status = repo.status()
    if not any(status.values()):
        print(_color("nothing staged, working tree matches HEAD", "dim"))
        return
    for path in status["staged_new"]:
        print(f"  {_color('new:', 'green')}      {path}")
    for path in status["staged_modified"]:
        print(f"  {_color('modified:', 'yellow')} {path}")
    for path in status["deleted"]:
        print(f"  {_color('deleted:', 'red')}  {path}")


def cmd_commit(args) -> None:
    repo, _ = _require_repo()
    try:
        cid = repo.commit(
            message=args.message,
            author=args.author,
            timestamp=int(time.time()),
        )
    except RepositoryError as exc:
        _die(str(exc))
    info = repo.get_commit(cid)
    branch = repo.refs.head_branch()
    print(
        f"[{_color(branch, 'cyan')} {_color(cid[:8], 'yellow')}] {info.message}"
    )
    print(
        _color(
            f"  {info.files_changed} file(s) changed, "
            f"+{info.insertions} -{info.deletions}",
            "dim",
        )
    )


def cmd_log(args) -> None:
    repo, _ = _require_repo()
    history = repo.log(branch=args.branch)
    if not history:
        print(_color("no commits yet", "dim"))
        return
    for info in history:
        marker = _color("◆", "magenta") if info.is_merge else _color("●", "green")
        when = time.strftime("%Y-%m-%d %H:%M", time.localtime(info.timestamp))
        print(f"{marker} {_color(info.id[:8], 'yellow')} {_color(info.message, 'bold')}")
        tag = _color("merge", "magenta") + " · " if info.is_merge else ""
        print(_color(f"    {tag}{info.author} · {when} · "
                     f"+{info.insertions} -{info.deletions}", "dim"))


def cmd_branch(args) -> None:
    repo, _ = _require_repo()
    if args.name:
        try:
            repo.create_branch(args.name)
        except RepositoryError as exc:
            _die(str(exc))
        print(f"Created branch {_color(args.name, 'cyan')}")
        return
    current = repo.refs.head_branch()
    for name, tip in repo.refs.list_branches().items():
        prefix = _color("*", "green") if name == current else " "
        short = tip[:8] if tip else "(unborn)"
        print(f"{prefix} {_color(name, 'cyan')} {_color(short, 'dim')}")


def cmd_checkout(args) -> None:
    repo, root = _require_repo()
    try:
        repo.checkout(args.branch)
    except RepositoryError as exc:
        _die(str(exc))
    _materialize(repo, root)
    print(f"Switched to branch {_color(args.branch, 'cyan')}")


def cmd_merge(args) -> None:
    repo, root = _require_repo()
    try:
        cid = repo.merge(args.branch, author=args.author, timestamp=int(time.time()))
    except RepositoryError as exc:
        _die(str(exc))
    _materialize(repo, root)
    info = repo.get_commit(cid)
    kind = "merge commit" if info.is_merge else "fast-forward"
    print(f"Merged {_color(args.branch, 'cyan')} ({kind}) -> {_color(cid[:8], 'yellow')}")


def cmd_diff(args) -> None:
    repo, _ = _require_repo()
    diffs = repo.diff_commits(args.old, args.new)
    if not diffs:
        print(_color("no differences", "dim"))
        return
    for path, filediff in diffs.items():
        print(_color(f"── {path} ──", "bold"))
        for line in filediff.lines:
            if line.op is LineOp.ADD:
                print(_color(f"+ {line.text}", "green"))
            elif line.op is LineOp.REMOVE:
                print(_color(f"- {line.text}", "red"))
            else:
                print(_color(f"  {line.text}", "dim"))


def cmd_restore(args) -> None:
    repo, root = _require_repo()
    try:
        content = repo.restore_file(args.path, commit_id=args.commit)
    except RepositoryError as exc:
        _die(str(exc))
    dest = root / args.path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
    print(f"Restored {_color(args.path, 'cyan')} and re-staged it.")


def _materialize(repo: Repository, root: Path) -> None:
    """Write the current index snapshot back out to the working directory."""
    for path, blob_id in repo.index.entries().items():
        dest = root / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(repo.objects.get_blob(blob_id).data)


# --------------------------------------------------------------------------- #
# argument parsing
# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="gitforge", description="GitForge VCS")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("init", help="create a repository")
    p.add_argument("--branch", default="main")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("add", help="stage files")
    p.add_argument("paths", nargs="*")
    p.set_defaults(func=cmd_add)

    p = sub.add_parser("status", help="show staged changes")
    p.set_defaults(func=cmd_status)

    p = sub.add_parser("commit", help="record a snapshot")
    p.add_argument("-m", "--message", required=True)
    p.add_argument("--author", default="GitForge User")
    p.set_defaults(func=cmd_commit)

    p = sub.add_parser("log", help="show commit history")
    p.add_argument("--branch", default=None)
    p.set_defaults(func=cmd_log)

    p = sub.add_parser("branch", help="list or create branches")
    p.add_argument("name", nargs="?")
    p.set_defaults(func=cmd_branch)

    p = sub.add_parser("checkout", help="switch branches")
    p.add_argument("branch")
    p.set_defaults(func=cmd_checkout)

    p = sub.add_parser("merge", help="merge a branch into the current one")
    p.add_argument("branch")
    p.add_argument("--author", default="GitForge User")
    p.set_defaults(func=cmd_merge)

    p = sub.add_parser("diff", help="diff two commits")
    p.add_argument("old", nargs="?", default=None)
    p.add_argument("new")
    p.set_defaults(func=cmd_diff)

    p = sub.add_parser("restore", help="restore a file from history")
    p.add_argument("path")
    p.add_argument("--commit", default=None)
    p.set_defaults(func=cmd_restore)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
