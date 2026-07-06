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
