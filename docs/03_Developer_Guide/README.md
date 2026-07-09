# GitForge Developer Guide

This guide explains how to **extend** GitForge. Each module is documented with its
purpose, responsibilities, dependencies, public API, and extension points.

> **Reading order:** This guide assumes familiarity with the
> [Concept Handbook](../01_Concept_Handbook/) and
> [Architecture Guide](../02_Architecture_Guide/).

---

## Backend modules

### `app/core/` — the engine

| Module | Purpose | Public API | Extension point |
|--------|---------|------------|-----------------|
| `hashing` | Content-addressable id generation | `hash_bytes(type, payload) -> str` | Add new object types |
| `objects` | Blob / Tree / Commit value types | `Blob`, `Tree`, `Commit`, `ObjectType`, `EntryMode` | Add new fields to Commit |
| `object_store` | SQLite-backed CAS | `ObjectStore(conn)` with `put(obj)`, `get_*()`, `exists()`, `count()`, `total_size()` | Add secondary indexes |
| `refs` | Branches, HEAD, tags | `RefStore(conn)` with `head_branch()`, `set_head()`, `create_branch()`, `update_branch()` | Add lightweight tags |
| `index` | Staging area | `Index(conn)` with `stage()`, `unstage()`, `entries()`, `replace_all()` | Add assume-unchanged flag |
| `diff` | Text diff (LCS) | `diff_text(a, b) -> FileDiff` | Add word-level diff |
| `dag` | Commit graph queries | `ancestors()`, `merge_base()`, `topological_history()` | Add commit-reachability filters |
| `merge` | Three-way merge | `three_way_merge(base, ours, theirs) -> MergeResult` | Add conflict markers |
| `repository` | Facade | `Repository` class with `commit()`, `checkout()`, `merge()`, `log()`, `diff_commits()`, `file_history()`, `restore_file()` | Add new high-level commands |

**Adding a new engine feature (e.g., blame):**
1. Create a new module (e.g., `blame.py`).
2. Use `Repository.file_history()` to walk commits touching a file.
3. Walk backwards and compute line-level diffs.
4. Expose via a new service method and API route.

---

### `app/services/` — business logic

| Service | Purpose | Depends on |
|---------|---------|------------|
| `RepoService` | Commit, branch, diff, file history | `Repository` |
| `GraphService` | Build React Flow graph with lanes | `Repository.log()` |
| `AnalyticsService` | Stats, heatmaps, contributor lists | `Repository.log()`, `Repository.branches()` |
| `InsightService` | Rule-based heuristics (large commits, stale branches) | `CommitInfo`, `RepoOverviewDTO` |

**Extending a service:**
1. Add a new method that calls existing engine methods.
2. Map engine types to DTOs.
3. Wire into FastAPI via dependency injection (`dependencies.py`).

---

### `app/api/` — transport layer

| File | Responsibility |
|------|----------------|
| `routes.py` | Thin endpoints: parse params, call service, return DTO |
| `dependencies.py` | FastAPI `Depends` wiring; creates services per-request |
| `main.py` | App factory, lifespan (provider init), CORS |

**Adding a new endpoint:**
1. Add a DTO (or reuse an existing one) in `schemas.py`.
2. Export it from `dto/__init__.py`.
3. Add a route function in `routes.py`.
4. Re-export via `dependencies.py` if needed.

---

## Frontend modules

### `lib/` — utilities

| File | Purpose |
|------|---------|
| `api/client.ts` | Minimal typed fetch wrapper, error handling |
| `api/endpoints.ts` | One function per route, wraps `client` |
| `api/types.ts` | TypeScript interfaces mirroring backend DTOs |
| `hooks/queries.ts` | React Query hooks per endpoint |
| `format.ts` | Presentational helpers: `shortHash`, `relativeTime`, `laneColor` |
| `utils.ts` | `cn()` Tailwind merger |

**Adding a new API call:**
1. Add the response type to `types.ts`.
2. Add an endpoint function in `endpoints.ts`.
3. Create a hook in `queries.ts` returning `useQuery(...)`.

---

### `store/` — state

| Store | Purpose |
|-------|---------|
| `useRepoStore` | Zustand: selection, hover, search, Time Machine cursor |

**State model rule:** Server data lives in React Query (async, cached). UI state
lives in Zustand (sync, derived). Time Machine cursor is pure derived state.

---

### `components/` — the view layer

| Component | Purpose |
|-----------|---------|
| `layout/` | Shell (`AppShell`, `Sidebar`, `TopBar`, `RightPanel`, `BottomBar`) |
| `graph/` | React Flow DAG (`CommitGraph`, `CommitNode`, edges) |
| `inspector/` | Floating commit inspector (`CommitInspector`, `DiffViewer`) |
| `analytics/` | Charts (`AnalyticsDashboard`, `InsightsFeed`) |
| `files/` | Animated file tree (`FileExplorer`) |
| `command/` | Command palette (`CommandPalette`) |
| `timemachine/` | Timeline scrubber (`TimeMachineBar`) |
| `ui/` | shadcn primitives (`Button`, `Card`, `Badge`, `Skeleton`, etc.) |

**Adding a new visual component:**
1. Create in the appropriate subfolder.
2. Use `glass` class for frosted panels.
3. Animate entry/exit with Framer Motion.
4. Connect to React Query via hooks.

---

## Future improvements (Phase 6+)

| Feature | Module(s) |
|---------|-----------|
| GitLens blame | `core/blame.py`, new API route `GET /blame?path=` |
| Restore endpoint | `POST /restore` in `routes.py` + `RestoreRequest` DTO |
| Search backend | Full-text search over commit messages (SQLite FTS5) |
| File dependency graph | New service analyzing import statements |
| Drag-and-drop cherry-pick | New mutation route + drag-and-drop in graph |