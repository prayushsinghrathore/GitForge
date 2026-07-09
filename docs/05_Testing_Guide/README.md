# GitForge Testing Guide

Test strategy, how to run tests, and what each suite guards.

---

## Current test status

| Suite | Count | Status |
|-------|-------|--------|
| Backend (pytest) | 61 | ✅ All passing |
| TypeScript | — | ✅ 0 errors |
| Production build | — | ✅ Succeeds |
| Lint (oxlint) | — | ✅ 0 errors |

---

## Backend tests

### How to run

```bash
cd backend

# Run all tests
python -m pytest

# Verbose mode
python -m pytest -v

# Run a specific test file
python -m pytest tests/test_repository.py -v

# Run a specific test
python -m pytest tests/test_blame.py::test_blame_modified_line_moves_to_newer_commit -v

# Run with coverage
python -m pytest --cov=app tests/
```

### Test files

| File | Tests | Coverage |
|------|-------|----------|
| `tests/test_repository.py` | 14 | Repository facade: init, commit, branch, checkout, merge, diff, restore, status, file_history, persistence |
| `tests/test_api.py` | 14 | HTTP endpoints: health, graph, branches, commit, analytics, mutation flow, blame API, restore API, import API |
| `tests/test_blame.py` | 6 | Blame engine: unchanged, modified, added, deleted lines, metadata enrichment, nonexistent file |
| `tests/test_dag.py` | 5 | DAG algorithms: ancestors, is_ancestor, merge_base (diverged, ancestor, unrelated, multiple LCA) |
| `tests/test_diff.py` | 6 | LCS diff: no change, pure insertion, pure deletion, modification, line numbers, from empty |
| `tests/test_merge.py` | 6 | Three-way merge: non-overlapping, single-add, identical change, conflict markers, delete vs unchanged, delete vs modify |
| `tests/test_objects.py` | 8 | Objects: blob determinism, blob round-trip, empty blob vs tree, tree ordering, tree round-trip, commit round-trip, merge detection, single parent |

### Test strategy

**Engine tests (`test_repository.py`, `test_dag.py`, `test_diff.py`, `test_merge.py`, `test_objects.py`):**

- Pure unit tests. Each test creates an isolated in-memory repository via `pytest` fixtures.
- Deterministic: the `clock` fixture provides monotonically increasing timestamps.
- Edge cases: empty repos, root commits, branches, merge conflicts, persistence across reopen.

**API tests (`test_api.py`):**

- Integration tests using FastAPI's `TestClient` with a temp data directory.
- Verify HTTP status codes, response shapes, and error conditions.
- Test mutation flow end-to-end (stage → commit → log → merge).

**Blame tests (`test_blame.py`):**

- Unit tests verifying line-level attribution across multiple commits.
- Covers: unchanged lines, modified lines, added lines, deleted lines, metadata shaping, path-not-found.

---

## Frontend tests

### How to run

```bash
cd frontend

# Run all Vitest tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Test files

| File | Tests | Coverage |
|------|-------|----------|
| `test/analytics/AnalyticsDashboard.test.tsx` | 1 | Render smoke test + query helper |
| `test/diff/DiffView.test.tsx` | ? | DiffView rendering |
| `test/graph/graphLayout.test.ts` | ? | Graph lane layout algorithm |

### Test strategy

- **Component tests** — Render with `@testing-library/react` in jsdom, verify key elements exist.
- **Utility tests** — Pure function tests for layout algorithms, formatters.

---

## Manual verification

### Backend

```bash
# Start the server
cd backend
python -m uvicorn app.main:app --reload

# Test health
curl http://localhost:8000/api/health

# Test demo repo graph
curl http://localhost:8000/api/repos/demo/graph

# Test import with a real repo
curl -X POST http://localhost:8000/api/import/github \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/octocat/Hello-World"}'
```

### Frontend

```bash
# Start dev server (needs backend running)
cd frontend
npm run dev

# Open http://localhost:5173 in a browser
```

---

## Lint & type checking

### Backend

The backend uses `pyflakes` for syntax-level lint (configured in GitHub Actions):

```bash
pip install pyflakes
pyflakes app/ tests/ cli.py
```

### Frontend

```bash
cd frontend

# TypeScript type check
npx tsc --noEmit
# or
npm run typecheck

# Lint with oxlint
npm run lint
```

---

## Build verification

```bash
cd frontend

# Production build (runs tsc -b && vite build)
npm run build

# Preview the production build
npm run preview
```

The production build produces:

```
dist/
├── index.html              (1.1 KB)
├── assets/
│   ├── index-*.css        (45.6 KB)
│   └── index-*.js         (1,084 KB / 331 KB gzipped)
```

---

## CI pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs these checks on every push to `main`:

### `backend` job
1. Setup Python 3.12
2. Install deps
3. `pyflakes` lint
4. `pytest tests/ -v` (61 tests)

### `frontend` job
1. Setup Node 22
2. `npm ci`
3. `tsc --noEmit` (0 errors)
4. `npm run lint` (0 errors)
5. `npm test`
6. `npm run build`

### `deploy-check` job
1. Build backend Docker image
2. Build frontend Docker image

---

## Further reading

- [Developer Guide](../03_Developer_Guide/) — Adding tests for new features.
- [Deployment Guide](../06_Deployment_Guide/) — CI/CD configuration.
- [Architecture Guide](../02_Architecture_Guide/) — Understanding what each layer needs tested.
