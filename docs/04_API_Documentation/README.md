# GitForge API Documentation

Every HTTP endpoint: method, URL, parameters, request/response shapes, status codes, and examples.

> **Base URL:** All endpoints are prefixed with `/api`.  
> **Repository routes** are under `/api/repos/{name}` where `{name}` is a repository identifier (e.g., `demo`).

---

## Table of Contents

- [Health](#health)
- [List Repositories](#list-repositories)
- [Repository Graph](#repository-graph)
- [Commit Log](#commit-log)
- [List Branches](#list-branches)
- [Repository Status](#repository-status)
- [Inspect Commit](#inspect-commit)
- [Diff](#diff)
- [File History](#file-history)
- [Blame](#blame)
- [Analytics Overview](#analytics-overview)
- [Insights](#insights)
- [Stage File](#stage-file)
- [Commit](#commit)
- [Create Branch](#create-branch)
- [Checkout Branch](#checkout-branch)
- [Merge Branch](#merge-branch)
- [Restore File](#restore-file)
- [GitHub Import](#github-import)

---

## Health

**Verifies the backend is running.**

```
GET /api/health
```

### Response

```json
{
  "status": "ok",
  "service": "gitforge"
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Service is healthy |

---

## List Repositories

**Returns all available repository names.**

```
GET /api/repos
```

### Response

```json
{
  "repositories": ["demo", "octocat_Hello-World"]
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Repository list returned |

---

## Repository Graph

**Returns the commit DAG as positioned nodes and edges for React Flow.**

```
GET /api/repos/{name}/graph
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |

### Response — `CommitGraphDTO`

```json
{
  "nodes": [
    {
      "id": "a1b2c3d4e5f6...",
      "short": "a1b2c3d4",
      "author": "Ada Lovelace",
      "message": "Initial project scaffold",
      "timestamp": 1736154000,
      "is_merge": false,
      "is_head": true,
      "branch": "main",
      "lane": 0,
      "row": 0,
      "files_changed": 2,
      "insertions": 5,
      "deletions": 0,
      "insights": []
    }
  ],
  "edges": [
    {
      "source": "a1b2c3d4e5f6...",
      "target": "f6e5d4c3b2a1...",
      "is_merge": false
    }
  ],
  "head": "a1b2c3d4e5f6...",
  "lane_count": 3
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Graph data returned |

---

## Commit Log

**Returns commit history for a repository, newest first.**

```
GET /api/repos/{name}/log
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |
| `branch` | Query | string (optional) | Branch to show; defaults to HEAD |

### Response — array of `CommitDTO`

```json
[
  {
    "id": "a1b2c3d4e5f6...",
    "short": "a1b2c3d4",
    "parents": ["f6e5d4c3b2a1..."],
    "author": "Ada Lovelace",
    "message": "Initial project scaffold",
    "timestamp": 1736154000,
    "is_merge": false,
    "files_changed": 2,
    "insertions": 5,
    "deletions": 0
  }
]
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Commit log returned |

---

## List Branches

**Lists all branches with their tips and metadata.**

```
GET /api/repos/{name}/branches
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |

### Response — array of `BranchDTO`

```json
[
  {
    "name": "main",
    "tip": "a1b2c3d4e5f6...",
    "short_tip": "a1b2c3d4",
    "is_current": true,
    "commit_count": 8,
    "last_activity": 1736197200
  },
  {
    "name": "feature/auth",
    "tip": "e5f6g7h8i9j0...",
    "short_tip": "e5f6g7h8",
    "is_current": false,
    "commit_count": 2,
    "last_activity": 1736175600
  }
]
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Branch list returned |

---

## Repository Status

**Compares the staged index against HEAD's snapshot.**

```
GET /api/repos/{name}/status
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |

### Response — `StatusDTO`

```json
{
  "branch": "main",
  "staged_new": ["new_file.txt"],
  "staged_modified": ["src/core.py"],
  "deleted": []
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Status returned |

---

## Inspect Commit

**Returns full commit details, file diffs, and insights.**

```
GET /api/repos/{name}/commits/{commit_id}
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |
| `commit_id` | Path | string | Full commit hash |

### Response — `CommitInspectorDTO`

```json
{
  "commit": {
    "id": "a1b2c3d4e5f6...",
    "short": "a1b2c3d4",
    "parents": ["f6e5d4c3b2a1..."],
    "author": "Ada Lovelace",
    "message": "Initial project scaffold",
    "timestamp": 1736154000,
    "is_merge": false,
    "files_changed": 2,
    "insertions": 5,
    "deletions": 0
  },
  "files": [
    {
      "path": "src/core.py",
      "insertions": 1,
      "deletions": 0,
      "lines": [
        {"op": "add", "old_lineno": null, "new_lineno": 1, "text": "def hello(): return 'world'"}
      ]
    }
  ],
  "insights": ["This commit is unusually large (+5/-0)."]
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Commit details returned |
| 409 | Engine error (invalid commit id, etc.) |

---

## Diff

**Returns the diff between two commits (or from nothing to a commit).**

```
GET /api/repos/{name}/diff
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |
| `new` | Query | string | Newer commit id |
| `old` | Query | string (optional) | Older commit id; omitting shows diff from empty |

### Response — array of `DiffFileDTO`

```json
[
  {
    "path": "src/core.py",
    "insertions": 1,
    "deletions": 1,
    "lines": [
      {"op": "equal", "old_lineno": 1, "new_lineno": 1, "text": "def hello():"},
      {"op": "remove", "old_lineno": 2, "new_lineno": null, "text": "    return 'old'"},
      {"op": "add", "old_lineno": null, "new_lineno": 2, "text": "    return 'new'"}
    ]
  }
]
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Diff returned |
| 409 | Engine error |

---

## File History

**Returns every commit that changed a given file.**

```
GET /api/repos/{name}/files/history
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |
| `path` | Query | string | Repo-relative file path |

### Response — `FileHistoryDTO`

```json
{
  "path": "src/core.py",
  "commits": [
    {
      "id": "a1b2c3d4e5f6...",
      "short": "a1b2c3d4",
      "parents": ["f6e5d4c3b2a1..."],
      "author": "Ada Lovelace",
      "message": "Initial project scaffold",
      "timestamp": 1736154000,
      "is_merge": false,
      "files_changed": 2,
      "insertions": 5,
      "deletions": 0
    }
  ]
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | File history returned |

---

## Blame

**Annotates each line of a file with the commit that last changed it.**

```
GET /api/repos/{name}/blame
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |
| `path` | Query | string | Repo-relative file path |

### Response — `BlameFileDTO`

```json
{
  "path": "src/core.py",
  "lines": [
    {
      "lineno": 1,
      "content": "def hello():",
      "commit_id": "a1b2c3d4e5f6...",
      "short_id": "a1b2c3d4",
      "author": "Ada Lovelace",
      "timestamp": 1736154000,
      "message": "Initial project scaffold"
    }
  ]
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Blame annotations returned |

---

## Analytics Overview

**Returns repository-wide statistics and insights.**

```
GET /api/repos/{name}/analytics
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |

### Response — `RepoOverviewDTO`

```json
{
  "commit_count": 8,
  "branch_count": 3,
  "current_branch": "main",
  "object_count": 42,
  "repository_size_bytes": 16384,
  "contributor_count": 3,
  "last_commit": { ... },
  "commits_per_author": {
    "Ada Lovelace": 5,
    "Grace Hopper": 3
  },
  "activity_by_day": {
    "2025-01-06": 3,
    "2025-01-07": 5
  },
  "most_changed_files": [
    {"path": "src/core.py", "changes": 4}
  ],
  "largest_commits": [ ... ],
  "insights": [
    {"kind": "warning", "title": "Large commit", "detail": "...", "commit_id": "..."}
  ]
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Analytics returned |

---

## Insights

**Returns rule-based insights for the repository (stale branches, large commits, risky merges).**

```
GET /api/repos/{name}/insights
```

### Parameters

| Name | In | Type | Description |
|------|----|------|-------------|
| `name` | Path | string | Repository name |

### Response — array of `InsightDTO`

```json
[
  {
    "kind": "warning",
    "title": "Branch 'feature/auth' looks stale",
    "detail": "No activity for 14 days.",
    "commit_id": "e5f6g7h8i9j0..."
  }
]
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Insights returned |

---

## Stage File

**Stage a file for the next commit.**

```
POST /api/repos/{name}/stage
```

### Request body — `StageRequest`

```json
{
  "path": "src/new_feature.py",
  "content": "def new_feature():\n    pass\n"
}
```

### Response

```json
{
  "ok": true
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | File staged |

---

## Commit

**Create a commit from the staged index.**

```
POST /api/repos/{name}/commit
```

### Request body — `CommitRequest`

```json
{
  "message": "Add new feature",
  "author": "GitForge User"
}
```

`author` defaults to `"GitForge User"` if omitted.

### Response — `CommitDTO`

```json
{
  "id": "a1b2c3d4e5f6...",
  "short": "a1b2c3d4",
  "parents": ["f6e5d4c3b2a1..."],
  "author": "GitForge User",
  "message": "Add new feature",
  "timestamp": 1736154000,
  "is_merge": false,
  "files_changed": 1,
  "insertions": 3,
  "deletions": 0
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Commit created |
| 409 | Nothing staged to commit |

---

## Create Branch

**Create a new branch at a given commit (or HEAD).**

```
POST /api/repos/{name}/branches
```

### Request body — `BranchRequest`

```json
{
  "name": "feature/x",
  "at": null
}
```

`at` can be a commit id; `null` means HEAD.

### Response

```json
{
  "ok": true
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Branch created |
| 409 | Branch already exists |

---

## Checkout Branch

**Switch HEAD to a different branch and reset the index.**

```
POST /api/repos/{name}/checkout
```

### Request body — `BranchRequest`

```json
{
  "name": "feature/auth"
}
```

### Response

```json
{
  "ok": true
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Checkout successful |
| 409 | Branch does not exist |

---

## Merge Branch

**Merge another branch into the current branch.**

```
POST /api/repos/{name}/merge
```

### Request body — `MergeRequest`

```json
{
  "branch": "feature/auth",
  "author": "GitForge User"
}
```

`author` defaults to `"GitForge User"`.

### Response — `CommitDTO`

```json
{
  "id": "merge_commit_id...",
  "short": "a1b2c3d4",
  "parents": ["parent_1...", "parent_2..."],
  "author": "GitForge User",
  "message": "Merge branch 'feature/auth' into 'main'",
  "timestamp": 1736154000,
  "is_merge": true,
  "files_changed": 3,
  "insertions": 10,
  "deletions": 2
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Merge completed |
| 409 | Merge conflict or missing branch |

---

## Restore File

**Restore a file from a historical commit and re-stage it.**

```
POST /api/repos/{name}/restore
```

### Request body — `RestoreRequest`

```json
{
  "path": "src/core.py",
  "commit_id": "a1b2c3d4e5f6..."
}
```

`commit_id` can be omitted to restore from HEAD.

### Response

```json
{
  "ok": true
}
```

### Status codes

| Code | Meaning |
|------|---------|
| 200 | File restored and re-staged |
| 409 | File not found in specified commit |

---

## GitHub Import

**Import a public GitHub repository into GitForge.**

```
POST /api/import/github
```

### Request body — `ImportRepoRequest`

```json
{
  "repo_url": "https://github.com/octocat/Hello-World",
  "name": null
}
```

`name` is optional; if omitted, the repo name is auto-derived from the URL (e.g., `octocat_Hello-World`).

### Response — `ImportStatusDTO`

```json
{
  "name": "octocat_Hello-World",
  "commit_count": 5,
  "status": "imported"
}
```

### Flow

1. URL is validated (must be a GitHub HTTPS or SSH URL).
2. Repository is cloned via `git clone --bare`.
3. All commits are replayed through the GitForge engine.
4. Branch names and HEAD are preserved.
5. Temporary clone directory is cleaned up.

### Status codes

| Code | Meaning |
|------|---------|
| 200 | Repository imported successfully |
| 422 | Invalid GitHub URL |
| 500 | Clone or engine error |

---

## Further reading

- [Concept Handbook](../01_Concept_Handbook/) — Foundational concepts.
- [Developer Guide](../03_Developer_Guide/) — How to add new endpoints.
- [Deployment Guide](../06_Deployment_Guide/) — Running the API in production.
