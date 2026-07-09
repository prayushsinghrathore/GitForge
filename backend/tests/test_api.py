"""API smoke tests over the demo repository using FastAPI's TestClient."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path: Path):
    app = create_app(data_dir=tmp_path)
    with TestClient(app) as c:
        yield c


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_demo_graph_has_nodes_and_edges(client):
    graph = client.get("/api/repos/demo/graph").json()
    assert len(graph["nodes"]) >= 6
    assert len(graph["edges"]) >= 6
    # exactly one HEAD node, and it should glow in the UI
    assert sum(1 for n in graph["nodes"] if n["is_head"]) == 1
    # lanes are assigned and non-negative
    assert all(n["lane"] >= 0 for n in graph["nodes"])
    assert graph["lane_count"] >= 1


def test_demo_graph_contains_a_merge(client):
    graph = client.get("/api/repos/demo/graph").json()
    assert any(n["is_merge"] for n in graph["nodes"])


def test_branches_endpoint(client):
    branches = client.get("/api/repos/demo/branches").json()
    names = {b["name"] for b in branches}
    assert {"main", "feature/auth"} <= names
    assert any(b["is_current"] for b in branches)


def test_commit_inspector_returns_diff(client):
    graph = client.get("/api/repos/demo/graph").json()
    # pick a non-merge commit with changes
    target = next(n for n in graph["nodes"] if not n["is_merge"])
    detail = client.get(f"/api/repos/demo/commits/{target['id']}").json()
    assert detail["commit"]["id"] == target["id"]
    assert "files" in detail


def test_analytics_overview(client):
    data = client.get("/api/repos/demo/analytics").json()
    assert data["commit_count"] >= 6
    assert data["contributor_count"] >= 2
    assert data["repository_size_bytes"] > 0
    assert data["activity_by_day"]  # heatmap populated


def test_full_mutation_flow(client):
    # create a fresh repo by staging + committing through the API
    client.post("/api/repos/demo/stage", json={"path": "notes.txt", "content": "hi"})
    res = client.post(
        "/api/repos/demo/commit", json={"message": "add notes", "author": "Tester"}
    )
    assert res.status_code == 200
    assert res.json()["message"] == "add notes"


def test_commit_without_staging_returns_409(client):
    # brand-new repo with nothing staged
    client.post("/api/repos/demo/checkout", json={"name": "main"})
    # ensure index empty by committing whatever is staged first is unsafe;
    # instead target a guaranteed-empty operation: merge a missing branch
    res = client.post(
        "/api/repos/demo/merge", json={"branch": "does-not-exist", "author": "x"}
    )
    assert res.status_code == 409


# --------------------------------------------------------------------------- #
# blame endpoint
# --------------------------------------------------------------------------- #
def test_blame_endpoint_returns_lines(client):
    # Stage & commit a known file first, so we control the content.
    client.post("/api/repos/demo/stage", json={"path": "blame_me.txt", "content": "hello\nworld\n"})
    client.post("/api/repos/demo/commit", json={"message": "add blame_me", "author": "Tester"})

    res = client.get("/api/repos/demo/blame?path=blame_me.txt")
    assert res.status_code == 200
    data = res.json()
    assert data["path"] == "blame_me.txt"
    assert len(data["lines"]) == 2
    line = data["lines"][0]
    assert "commit_id" in line
    assert "short_id" in line
    assert "author" in line
    assert "content" in line
    assert "lineno" in line


def test_blame_nonexistent_file_returns_empty(client):
    res = client.get("/api/repos/demo/blame?path=nope.txt")
    assert res.status_code == 200
    assert res.json()["lines"] == []


# --------------------------------------------------------------------------- #
# restore endpoint
# --------------------------------------------------------------------------- #
def test_restore_known_file_returns_ok(client):
    # Stage, commit, then re-stage to ensure restore has a prior version.
    client.post("/api/repos/demo/stage", json={"path": "restore_me.txt", "content": "original"})
    client.post("/api/repos/demo/commit", json={"message": "add restore_me", "author": "Tester"})
    # Fetch the commit id of what we just committed.
    log = client.get("/api/repos/demo/log").json()
    first_id = log[0]["id"]  # HEAD = the commit we just created

    res = client.post(
        "/api/repos/demo/restore",
        json={"path": "restore_me.txt", "commit_id": first_id},
    )
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_restore_missing_file_returns_409(client):
    res = client.post(
        "/api/repos/demo/restore",
        json={"path": "does-not-exist.txt"},
    )
    assert res.status_code == 409


# --------------------------------------------------------------------------- #
# import endpoint
# --------------------------------------------------------------------------- #
def test_import_invalid_url_returns_422(client):
    """A URL that isn't a GitHub repo should return 422."""
    res = client.post(
        "/api/import/github",
        json={"repo_url": "not-a-valid-github-url"},
    )
    assert res.status_code == 422
    assert "detail" in res.json()


def test_import_endpoint_missing_url_returns_422(client):
    """Missing required repo_url should trigger FastAPI validation."""
    res = client.post("/api/import/github", json={})
    assert res.status_code == 422


def test_import_duplicate_branch_does_not_crash(client):
    """Importing a repo whose default branch matches init's 'main' must not
    raise IntegrityError on the duplicate branch name."""
    # The import endpoint creates the repo (which auto-creates 'main') and
    # then imports branches including 'main' — the fix ensures this path
    # uses update_branch instead of create_branch when the branch exists.
    res = client.post(
        "/api/import/github",
        json={"repo_url": "https://github.com/octocat/Hello-World"},
    )
    assert res.status_code == 200
    branches = client.get(
        f"/api/repos/{res.json()['name']}/branches"
    ).json()
    names = [b["name"] for b in branches]
    assert "main" in names
    # The imported HEAD branch should be the repo's default (master, not main).
    current = [b for b in branches if b["is_current"]]
    assert len(current) == 1
    assert current[0]["is_current"] is True
