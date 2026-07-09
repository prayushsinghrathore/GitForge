# GitForge Interview Guide

A comprehensive preparation resource covering the project's architecture, design decisions, implementation details, and realistic interview questions with detailed answers.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Design Decisions](#design-decisions)
- [Complexity Analysis](#complexity-analysis)
- [Interview Questions](#interview-questions)
  - [Architecture & Design](#architecture--design)
  - [Backend Implementation](#backend-implementation)
  - [Frontend Implementation](#frontend-implementation)
  - [Algorithms & Data Structures](#algorithms--data-structures)
  - [System Design](#system-design)
  - [General Engineering](#general-engineering)

---

## Project Overview

**GitForge** is a complete, Git-inspired version control system implemented from scratch. It combines a custom VCS engine (Python/FastAPI/SQLite) with an interactive visualization frontend (React/TypeScript/React Flow) to demonstrate how modern version control systems work internally.

Key differentiators:
- No Git CLI is used internally — every mechanism is hand-implemented.
- Content-addressable object store backed by SQLite.
- Interactive commit DAG rendered with React Flow.
- GitHub repository import via `git clone --bare`.
- Rule-based developer insights (no AI, deterministic heuristics).
- Repository Time Machine for replaying history.

### What it demonstrates

- **Systems programming:** Content-addressable storage, hashing, tree data structures, DAG traversal.
- **Algorithm design:** LCS diff, three-way merge, topological sort, merge-base computation.
- **Full-stack engineering:** FastAPI + React + TypeScript + SQLite + Docker.
- **Software architecture:** Service layer pattern, dependency injection, DTOs, React Query + Zustand state management.
- **DevOps:** Docker multi-stage builds, docker-compose, GitHub Actions CI.

---

## Design Decisions

### Why FastAPI?

| Consideration | FastAPI | Flask | Django |
|---------------|---------|-------|--------|
| Type safety | ✅ Pydantic models | ❌ Manual validation | ✅ Serializers |
| Performance | ✅ Async (Starlette) | ❌ Sync | ⚠️ Async add-on |
| API docs | ✅ Auto OpenAPI/Swagger | ❌ Manual | ❌ Manual |
| Complexity | Low | Low | High |

FastAPI was chosen for:
- **Automatic request/response validation** via Pydantic — the DTO layer is enforced at the framework level.
- **Auto-generated OpenAPI docs** — the API is self-documenting during development.
- **Minimal boilerplate** — routes are plain Python functions with type annotations.

### Why React?

- **Component model** maps well to the UI's modular structure (graph, inspector, analytics, file explorer).
- **React Query** provides async state management for server data with zero boilerplate for caching, refetching, and invalidation.
- **Ecosystem** — React Flow, Recharts, Framer Motion are all React-native libraries.
- **TypeScript** catches React-specific errors (missing props, wrong event handlers) at compile time.

### Why SQLite?

- **Zero configuration** — no database server, no connection strings, no migrations.
- **Single file** — a GitForge repository is a single `.gitforge/store.db` file. Easy to backup, copy, or delete.
- **Transactional** — ACID guarantees via SQLite's transaction support prevent corruption during write operations.
- **Built into Python** — `sqlite3` is in the standard library. No external dependencies.

This mirrors Git's approach of storing everything in a single `.git` directory.

### Why a custom DAG instead of a library?

- **Educational purpose** — implementing `merge_base`, `ancestors`, and `topological_history` demonstrates understanding of graph algorithms.
- **No external dependency** — the DAG module is ~90 lines of pure Python with zero dependencies.
- **Exact control** — custom lane assignment for the visual graph layout needs specific ordering guarantees that generic graph libraries don't provide.

---

## Complexity Analysis

### Core operations

| Operation | Time | Space | Algorithm |
|-----------|------|-------|-----------|
| Blob storage | O(1) | O(N) | SHA-256 hash + SQLite INSERT |
| Tree construction | O(F log F) | O(F) | Sort entries by name, recursive build |
| Commit creation | O(F) | O(F) | Build tree, create commit object |
| Log (topological) | O(C log C) | O(C) | Sort commits by (timestamp, id) |
| Merge base | O(C1 + C2) | O(C1) | BFS generation + ancestor set intersection |
| Diff | O(N × M) | O(N × M) | LCS DP table |
| Three-way merge | O(F × A) | O(F × A) | Per-file diff base vs ours vs theirs |
| Blame | O(H × D) | O(L) | Walk H file-history commits, diff each pair |
| File history | O(C + H) | O(C) | Walk all commits, filter changed paths |

Where:
- N, M = line counts of old/new files
- F = file count in index/snapshot
- C = commit count in DAG
- H = commits touching a specific file
- L = line count of current file
- A = average line count per file
- D = average diff size

### Storage

| Object type | Size per object | Count |
|-------------|----------------|-------|
| Blob | Content bytes | One per unique file version |
| Tree | ~40 bytes per entry | One per commit |
| Commit | ~200–500 bytes | One per commit |

Total storage for the demo repository (8 commits, 6 files): ~16 KB.

---

## Interview Questions

### Architecture & Design

**1. Why did you build a version control system from scratch instead of wrapping Git?**

> GitForge is fundamentally an educational project. The goal was to demonstrate understanding of version control internals — content-addressable storage, commit DAGs, merge algorithms, diff computation — by implementing them. Wrapping Git would prove knowledge of the Git CLI, not understanding of the underlying data structures and algorithms. The engine is framework-free and testable, which also made it straightforward to expose via a REST API.

**2. How is GitForge's object store different from Git's?**

> Git stores objects as individual compressed files in `.git/objects/` with a two-character directory prefix (the first two hex chars of the SHA-1 hash). GitForge stores all objects in a single SQLite table with columns for id, type, and payload. Both are content-addressable. SQLite simplifies queries (COUNT, total_size, type filtering) and avoids filesystem overhead for large object counts, at the cost of not benefiting from filesystem-level deduplication.

**3. Why SHA-256 instead of SHA-1?**

> SHA-1 is showing signs of weakness (the SHAttered attack demonstrated a feasible collision). SHA-256 is the current standard for cryptographic hashing and is available in Python's `hashlib` without external dependencies. A 256-bit output also provides a larger address space, though in practice the output is hex-encoded for readability rather than used as raw bytes.

**4. How does the service layer pattern benefit this project?**

> The service layer (`RepoService`, `GraphService`, etc.) decouples the HTTP transport from the engine. The engine (`core/`) is framework-free — it doesn't import FastAPI, Pydantic, or any web framework. This means:
> - Engine tests don't need FastAPI's TestClient.
> - The CLI (`cli.py`) uses the same engine without going through HTTP.
> - Adding a new API endpoint requires only a route function and, if needed, a new service method — the engine stays unchanged.

**5. Describe the dependency injection setup.**

> FastAPI's `Depends` is used as a lightweight DI container. At startup, a `RepositoryProvider` is created and stored on `app.state`. Per-request dependencies (`RepoDep`, `RepoServiceDep`, etc.) resolve the requested repository by name and construct the appropriate service object. Services are stateless and cheap to create, so building them per request keeps the dependency graph explicit and thread-safe.

**6. How does the React Query + Zustand separation work?**

> React Query owns all server state — graph data, branches, analytics, insights, blame, etc. Queries are keyed by repository name (`['graph', repo]`), so switching repos transparently re-fetches with the correct cache namespace. Zustand owns ephemeral UI state — what's selected, which panel is active, the search query, the Time Machine cursor. Mutations invalidate the relevant query keys on success, triggering refetches.
>
> The separation rule: if it comes from the server, it goes in React Query. If it's view-local, it goes in Zustand.

**7. How would you add authentication to GitForge?**

> FastAPI has built-in support for OAuth2 with JWT tokens. I would add a `auth` router with `/login` and `/register` endpoints, create a `get_current_user` dependency that validates JWT tokens from the Authorization header, and apply it as a dependency to all existing routes. The user identity would be passed through to the service layer for authorization checks.

**8. Explain the CORS configuration.**

> The backend currently allows all origins (`allow_origins=["*"]`) because it's designed for local/trusted-network development. In production, this would be tightened to the specific frontend domain. In the Docker deployment, CORS is not needed at all because nginx reverse-proxies everything through a single origin.

**9. How would you scale GitForge beyond a single-user tool?**

> The simplest path: add SQLite WAL mode for concurrent reads, add a user table, scope repositories per user. The object store is already indexed on `(id, type)` — query performance is O(1). For multi-user collaboration, the merge engine already handles concurrent changes — you'd need a push/pull protocol on top of the object store, similar to how Git uses remote refs and packfiles.

**10. What monitoring would you add?**

> FastAPI middleware can log request duration, endpoint, and status code. The analytics endpoint already exposes repository-level metrics (commit count, contributor count, size). For production, I'd add:
> - Structured logging (JSON lines to stdout, collected by Docker).
> - Health check endpoint (already exists).
> - Prometheus metrics for request rate, latency, error rate.
> - Docker health checks for container orchestration.

---

### Backend Implementation

**11. Walk through what happens when `POST /commit` is called.**

> 1. FastAPI validates the request body (CommitRequest Pydantic model).
> 2. The route calls `svc.commit(body.message, body.author)`.
> 3. `RepoService.commit()` calls `self._repo.commit(message, author, timestamp)`.
> 4. The Repository reads the index entries (staged files).
> 5. It computes stats against the parent snapshot (files_changed, insertions, deletions).
> 6. It builds a tree from the flat index (grouping paths into nested directories).
> 7. It creates a Commit object with the tree id, parent(s), author, message, timestamp, and stats.
> 8. It stores the commit via `ObjectStore.put(commit)`.
> 9. It advances the current branch pointer to the new commit id.
> 10. The service converts the engine's CommitInfo into a CommitDTO and returns it.

**12. How does the three-way merge determine the merge base?**

> The merge base is the Lowest Common Ancestor (LCA) of two commit tips. The algorithm:
> 1. Compute distance from commit A to all its ancestors (BFS, recording shortest path).
> 2. Compute the set of all ancestors of commit B.
> 3. Intersect the two sets — these are common ancestors.
> 4. Among common ancestors, pick the one minimizing the sum of distances from A and B.
>
> This is implemented in `dag.merge_base()`.

**13. What happens during a merge conflict?**

> `three_way_merge()` compares the base, ours, and theirs versions of each file. For each file, every line is classified:
> - If both sides changed the same line differently → CONFLICT.
> - If one side changed and the other didn't → take the changed side.
> - If neither changed → keep base.
>
> On conflict, `Repository.merge()` raises `RepositoryError` with the list of conflicted paths. The merge is aborted — no conflict markers are written. The API returns HTTP 409.

**14. How does blame work without a dedicated core module?**

> Blame lives entirely in `RepoService.blame()`. It:
> 1. Calls `repo.file_history(path)` to get every commit that changed the file.
> 2. Reads the file's current content from HEAD.
> 3. Initializes an array `blame_owner[i] = HEAD.id` for each line.
> 4. Walks the history backward, diffing consecutive pairs via `repo.diff_commits(older, newer)`.
> 5. For EQUAL lines in the diff → pushes blame to the older commit.
> 6. For ADD lines → blame stays at the newer commit (where the line was introduced).
> 7. Enriches each line with author, timestamp, and message from `repo.get_commit()`.
>
> This reuses the existing diff engine and file history — no new core module needed.

**15. How does the GitHub import handle large repositories?**

> The import streams through commits sequentially. Each commit is processed individually:
> 1. `git rev-list --topo-order --reverse --all` provides the oldest-first commit order.
> 2. For each commit, `git ls-tree -r -z` lists files (null-delimited for path safety).
> 3. For each file, `git show SHA:path` retrieves the blob content.
> 4. Each file is staged and then committed via the GitForge engine.
>
> The 5-minute timeout on `git clone --bare` is generous. Larger repos can be handled by increasing the timeout and ensuring sufficient disk space for the temp clone.

**16. How is the staging index different from Git's index?**

> Git's index is a binary file (`.git/index`) with a specific format. GitForge's index is a SQLite table:
> ```sql
> CREATE TABLE index (path TEXT PRIMARY KEY, blob_id TEXT NOT NULL);
> ```
> Both serve the same purpose — mapping file paths to blob hashes. SQLite makes querying and modifying the index trivial, at the cost of not being parseable by standard Git tools (which isn't needed since GitForge is independent).

**17. Why are commit stats denormalized?**

> `files_changed`, `insertions`, and `deletions` are captured at commit time and stored in the commit payload. This avoids recomputing diffs for every commit when rendering graph views or analytics. The stats are computed once by diffing the new snapshot against the parent's snapshot, then stored alongside the commit's author and message.

**18. How does file_history work correctly across branches and merges?**

> `file_history()` walks all commits reachable from HEAD via `topological_history()`, then filters to commits where the file's blob differs from every parent's blob. For root commits, the file just needs to be present. Comparing against real parents (rather than adjacent log entries) keeps the result correct across branches and merges — a file that didn't change in a merge commit is correctly excluded.

**19. How would you add tags to GitForge?**

> Tags are "refs that don't move." In `RefStore`, I'd add a `tags` table:
> ```sql
> CREATE TABLE tags (name TEXT PRIMARY KEY, commit_id TEXT NOT NULL);
> ```
> A new `create_tag()` method would insert into this table. `checkout` would refuse non-branch refs. The existing `refs.py` pattern supports this with minimal new code.

**20. Explain the insight engine's rules.**

> The InsightService has 6 deterministic rules:
> 1. **Large commit** — if size > 3× the repo average and > 50 lines.
> 2. **Sensitive files** — if paths match auth/security keywords.
> 3. **Config changes** — if paths match config/deploy keywords.
> 4. **High-risk merge** — if merge is large relative to average.
> 5. **Refactoring** — if 4+ files with balanced insert/delete ratios.
> 6. **Stale branch** — if branch inactive for 14+ days.
>
> These are cheap to compute (no AI calls) and deterministic across runs.

---

### Frontend Implementation

**21. How does the commit graph assign lanes?**

> The graph uses a swim-lane algorithm. Walking commits newest → oldest:
> 1. Each commit claims the lane that was reserved for it by a child.
> 2. The first parent inherits the child's lane (keeps mainline straight).
> 3. Additional parents (merge targets) get new/free lanes.
> 4. Unreserved commits (branch tips) take the lowest free lane.
>
> This produces a deterministic layout where the main branch runs in a straight column and branches fan out to the right.

**22. How does the Time Machine work?**

> The Time Machine is a Zustand-driven cursor over the commit history. When enabled, the `cursor` (a Unix timestamp) is passed as a filter to graph and analytics queries. Commits with timestamps greater than the cursor are hidden. As the cursor moves forward (play mode), commits "appear" in sequence, creating a replay effect. The underlying data is unchanged — it's purely a view-level filter.

**23. How does the command palette integrate?**

> The command palette uses the `cmdk` (⌘K) library mounted at the App root. It's driven by Zustand's `paletteOpen` state. Commands include: switching panels, toggling Time Machine, creating branches, importing repositories. Each command dispatches to the appropriate store action or mutation.

**24. Why use React Flow instead of a simpler SVG renderer?**

> React Flow provides:
> - Built-in pan/zoom with smooth gestures.
> - Custom node and edge components (our commit circles and connection lines).
> - Automatic edge routing (bezier curves between lanes).
> - Selection and click handling.
> - Animation support via Framer Motion integration.
>
> Building equivalent functionality from scratch would be significant effort with no educational value for a VCS project.

**25. How does the analytics dashboard fetch and render data?**

> The analytics endpoint returns a `RepoOverviewDTO` with commit counts, contributor stats, activity heatmap, and most-changed files. The React Query hook `useAnalytics()` caches this with a 5-minute stale time. The dashboard uses Recharts for the activity bar chart and renders stats directly in glass cards. Framer Motion handles staggered entry animations.

**26. What happens when a user switches repositories?**

> `useRepoStore.setRepo(name)` updates the Zustand store's `repo` field. All React Query hooks use this value (either directly or via the hook parameter that defaults to the store value). Since query keys are namespaced by repo name (`['graph', repo]`), React Query automatically resolves to the correct cache entry or fetches new data. Selection state is cleared on switch.

**27. How are optimistic updates handled?**

> Currently, mutations don't use optimistic updates — they wait for the server response and then invalidate the query cache. This is acceptable because the engine operations are fast (sub-millisecond for common operations). For slower operations like GitHub import, a loading spinner with progress text provides feedback.

**28. How does the file explorer load and display file history?**

> The file explorer fetches the HEAD snapshot via `useSnapshot(head)` — a diff from the empty tree, where every line is an "add" carrying the file's current content. Selecting a file triggers `useFileHistory(path)`, which calls `GET /files/history?path=`. The history panel shows commits that changed the file, with author avatars, messages, and timestamps. Clicking a history entry navigates to the graph and selects the commit.

**29. Describe the lazy loading strategy.**

> Currently, the entire application bundle (~1 MB raw, ~331 KB gzipped) loads eagerly. The planned strategy (Batch 7) uses `React.lazy()` and `Suspense` to code-split on panel boundaries:
> - CommitGraph (static import — always needed).
> - AnalyticsDashboard (lazy — only when analytics tab is active).
> - FileExplorer (lazy — only when files tab is active).
> - TimeMachineBar (lazy — only when enabled).
> - ImportRepoDialog (lazy — only when opened).

**30. How are errors surfaced to the user?**

> API errors surface as `ApiError` exceptions from the fetch wrapper, carrying the backend's `detail` message. Mutations catch these in `onError` callbacks and push human-readable messages to the activity log in the bottom bar. Components show inline error states (e.g., "Failed to load commit details") for query failures. The command palette shows error toasts for operation failures.

---

### Algorithms & Data Structures

**31. Explain the LCS diff algorithm.**

> The LCS (Longest Common Subsequence) diff:
> 1. Build a DP table `dp[i][j]` = length of LCS of `a[i:]` and `b[j:]`.
> 2. Fill the table bottom-up. If `a[i] == b[j]`, `dp[i][j] = dp[i+1][j+1] + 1`. Otherwise, `dp[i][j] = max(dp[i+1][j], dp[i][j+1])`.
> 3. Walk the table to emit operations. When lines match, emit EQUAL and advance both pointers. When the top option has a longer LCS, emit REMOVE from `a`. Otherwise, emit ADD from `b`.
> 4. Emit any trailing REMOVE or ADD lines.
>
> This is the same class of algorithm under `diff(1)` and Git's default diff. It's O(N×M) in time and space.

**32. Why does the diff emit REMOVE+ADD for a modification instead of a single MODIFY operation?**

> A modification is conceptually a removal of old content followed by an addition of new content. The frontend pairs adjacent REMOVE/ADD lines to present a visual "modified" view. Keeping them as separate operations in the transport layer simplifies the diff algorithm (it doesn't need to detect "modifications" — it just finds the LCS and classifies everything else).

**33. How does the merge base algorithm handle multiple common ancestors?**

> The algorithm computes shortest distance from commit A to all ancestors, collects all common ancestors (intersection with B's ancestor set), and picks the one minimizing the sum of distances from both tips. This naturally prefers the "lowest" common ancestor — the one closest to both tips. If there are multiple at equal distance, the one closer to A wins (deterministic tiebreaker).

**34. Explain the tree serialization format.**

> Trees are serialized as:
> ```
> file <blob_id> <name>
> dir <tree_id> <name>
> ```
> One entry per line, sorted by name. This deterministic ordering guarantees that two trees with the same entries produce the same hash, regardless of insertion order.

**35. How would you implement `git stash` functionality?**

> `git stash` saves the current index and working tree changes, then resets to HEAD. In GitForge:
> 1. Read the current index entries.
> 2. Create a commit from them (with a special "stash" flag or a dedicated stash ref).
> 3. Reset the index to HEAD's snapshot.
> 4. To pop: checkout the stash commit, then delete the stash ref.
>
> The engine already has all the primitives — it's just a matter of not advancing the branch ref when creating the stash commit.

**36. How does object deduplication work?**

> Two files with identical content produce the same blob hash. When the engine stages a file, it computes the blob's SHA-256 hash and stores it only if it doesn't already exist (`ObjectStore.put()` is idempotent). Trees and commits similarly deduplicate — identical trees from different commits share one storage entry.

**37. What's the time complexity of a commit?**

> Creating a commit is O(F log F) where F is the number of staged files. Building the tree requires sorting entries by name at each directory level, then recursive serialization. The commit object itself is O(1) — it's just a few fields and parent pointers. In practice, for a typical commit with 5-20 files, this completes in microseconds.

**38. How would you implement `git rebase`?**

> Rebase replays commits from one branch onto another tip. Algorithm:
> 1. Find commits unique to the source branch (ancestors of source tip minus ancestors of target tip).
> 2. Order them oldest-first.
> 3. For each commit, diff against its parent.
> 4. Apply the diff onto the target tip, creating new commits (new hashes).
> 5. Move the branch pointer to the new commit chain.
>
> GitForge has all the primitives (diff, commit, branch operations) — rebase would be a new `Repository.rebase()` method.

**39. Explain the hashing strategy.**

> Every object is hashed as:
> ```
> hash = SHA256(type_byte + NUL + serialized_payload)
> ```
> The type prefix (`"blob\0"`, `"tree\0"`, `"commit\0"`) prevents collisions between object types — a blob can never have the same hash as a commit, even if their serialized content happens to match. This is the same strategy Git uses with SHA-1.

**40. How does the topological sort handle timestamp ties?**

> Commits are sorted by `(timestamp, id)` in descending order. The id (SHA-256 hash) serves as a deterministic tiebreaker for commits with equal timestamps. Since timestamps are Unix seconds, ties are rare in practice but the deterministic tiebreaker ensures reproducible log output.

---

### System Design

**41. Design a distributed version of GitForge.**

> A distributed GitForge would need:
> 1. **Remote protocol** — a wire protocol for transferring objects and refs between instances (like Git's smart HTTP protocol or SSH).
> 2. **Packfile protocol** — compress and batch multiple objects for network transfer.
> 3. **Push/pull model** — `git push` uploads objects and updates remote refs; `git pull` downloads objects and merges.
> 4. **Concurrency** — SQLite WAL mode for concurrent readers. Writers still serialize.
> 5. **Auth layer** — token-based authentication for remote operations.
>
> The engine already has all the primitives (objects, refs, diff, merge). The missing pieces are transport and concurrency.

**42. How would you add real-time collaboration?**

> For a Google-Docs-style collaboration experience:
> 1. Replace the merge endpoint with a WebSocket connection.
> 2. Use Operational Transformation or CRDT for conflict resolution.
> 3. Broadcast commits to all connected clients.
> 4. Update the React Query cache from WebSocket events (bypassing HTTP refetches).
>
> For a simpler PR-based model, the existing merge engine already works — you'd add "remote forks" where each user has their own repository and can create merge requests.

**43. How would you handle very large repositories (100K+ commits)?**

> For large repositories:
> 1. **Pagination** — the `/log` endpoint should support `?limit=N&offset=M` for incremental loading.
> 2. **Lazy graph** — only render visible commits; load more as the user scrolls/pans.
> 3. **SQLite performance** — add indexes on `objects.timestamp` and `objects.type` (currently just on `id`).
> 4. **Object packing** — compress and batch infrequently accessed objects.
> 5. **Incremental import** — for GitHub import, don't replay all commits upfront; load on demand.

**44. Design the schema for multi-user support.**

> ```sql
> CREATE TABLE users (
>     id TEXT PRIMARY KEY,
>     name TEXT NOT NULL,
>     email TEXT UNIQUE NOT NULL,
>     password_hash TEXT NOT NULL
> );
>
> CREATE TABLE repo_permissions (
>     repo_name TEXT NOT NULL,
>     user_id TEXT NOT NULL,
>     role TEXT NOT NULL,  -- 'owner', 'contributor', 'viewer'
>     PRIMARY KEY (repo_name, user_id)
> );
> ```
> The RepositoryProvider would check permissions when loading a repo. The FastAPI dependency `get_current_user` would extract the user from a JWT token and pass it through to the service layer.

**45. How would you improve the import performance?**

> Current bottleneck: importing a 1000-commit repo issues 1000+ git commands. Optimizations:
> 1. Use `git cat-file --batch` to stream blob contents instead of one `git show` per file.
> 2. Batch commits by building multiple trees and creating multiple commits in a single transaction.
> 3. Use `git fast-export` instead of individual rev-list/ls-tree/show commands.
> 4. Parallelize file content retrieval (multiple `git show` calls in parallel for files within a commit).

---

### General Engineering

**46. What testing strategy did you use for the diff engine?**

> The diff engine is tested with pure unit tests — no repository, no API. Each test case provides two lists of lines and asserts the expected operations:
> - No change → all EQUAL.
> - Pure insertion → all ADD.
> - Pure deletion → all REMOVE.
> - Modification → REMOVE + ADD at the same position.
> - Empty input → all ADD from new content.
>
> This makes the diff tests fast and deterministic. The LCS algorithm is well-suited to table-driven testing.

**47. How do you ensure the demo repository is reproducible?**

> The seed script uses a fixed starting timestamp (`_T0 = 1_736_154_000`) and a fixed step (`_STEP = 6 * 3600`). All commits use timestamps from a deterministic `_Clock` class, not the wall clock. This means the demo repository is byte-for-byte identical every time it's generated, which keeps graph layouts, analytics, and insights stable across runs.

**48. What edge cases does the merge engine handle?**

> The merge engine handles:
> - Fast-forward (current branch is behind).
> - Up-to-date (current branch is ahead).
> - Non-overlapping changes (clean auto-merge).
> - Identical changes on both sides (no conflict).
> - Delete on one side, unchanged on other (stays deleted).
> - Delete vs. modify (CONFLICT).
> - Edit vs. edit same line (CONFLICT).

**49. How would you add conflict markers to merge output?**

> The current merge raises an exception on conflict. To add markers:
> ```python
> def three_way_merge(base, ours, theirs, add_markers=True):
>     result = {}
>     for path in all_paths:
>         if path in conflicts:
>             if add_markers:
>                 result[path] = (
>                     "<<<<<<< ours\n" + ours_content +
>                     "=======\n" + theirs_content +
">>>>>>> theirs\n"
>                 )
>             result.conflicts.append(path)
>     return result
> ```
> This would match Git's conflict marker format and let users resolve conflicts manually.

**50. Describe the Docker architecture.**

> Two containers:
> - **backend** — Python 3.12-slim running uvicorn on port 8000. Mounts a named volume for persistent SQLite data.
> - **frontend** — Multi-stage build: Node 22 builds the app, then nginx serves the static files on port 80. Nginx reverse-proxies `/api/*` to the backend container.
>
> `docker-compose up -d` starts both containers on a shared network. The frontend is accessible on port 80, backend on port 8000 (but all traffic goes through port 80 in production).

**51. How does the CI pipeline prevent broken merges?**

> The GitHub Actions workflow has three jobs:
> 1. `backend` — installs deps, runs pyflakes lint, runs pytest (61 tests).
> 2. `frontend` — installs deps, runs TypeScript check, oxlint, Vitest, and production build.
> 3. `deploy-check` — only runs if both prior jobs pass; builds both Docker images.
>
> If any step fails, the workflow fails and the PR is blocked from merging. This ensures every merge to main has passing tests, zero TypeScript errors, and valid Docker images.

**52. How would you add end-to-end tests?**

> An e2e test would:
> 1. Start the backend (TestClient or subprocess).
> 2. Start the frontend build (serve `dist/` or Vite preview).
> 3. Use Playwright to navigate the UI, stage/commit files, switch repos, import a GitHub repo.
> 4. Assert the graph renders, analyze updates, diff shows changes.
>
> The existing API tests cover the backend surface. Adding Playwright would verify the frontend-backend integration end-to-end.

**53. Explain the difference between `repository.py` and `object_store.py`.**

> `object_store.py` is the low-level storage engine — it puts and gets raw bytes by hash. It doesn't understand branches, commits, or trees. `repository.py` is the high-level facade — it composes the object store, ref store, index, and DAG algorithms into user-facing operations (commit, branch, checkout, merge). The separation keeps the storage layer testable and replaceable independently of the version-control semantics.

**54. How does the frontend handle API errors?**

> The `client.ts` fetch wrapper catches non-2xx responses and throws an `ApiError` with the backend's `detail` message and HTTP status. React Query's `onError` callbacks in mutations push these to the activity log. Individual query hooks (like `useCommit`) expose `isError` which components use to show inline error states. The `_guard` wrapper in routes.py ensures engine errors are returned as HTTP 409 with the exact error message.

**55. What makes the demo repository a good demo?**

> The demo has:
> - 8 commits across 3 branches (main, feature/auth, hotfix/sort).
> - A real three-way merge (feature/auth merged into main).
> - Multiple authors (Ada Lovelace, Grace Hopper, Linus Torvalds).
> - A fast-forward merge (hotfix/sort).
> - Multiple file types (.py, .md, .txt).
> - Contributing commits that touch the same file.
>
> This provides enough data for the graph, analytics, and insights to be visually interesting without being overwhelming.

---

## Further reading

- [Concept Handbook](../01_Concept_Handbook/) — Foundational concepts from first principles.
- [Architecture Guide](../02_Architecture_Guide/) — System design with diagrams.
- [Developer Guide](../03_Developer_Guide/) — Per-module reference.
- [API Documentation](../04_API_Documentation/) — Endpoint specifications.
- [Testing Guide](../05_Testing_Guide/) — How to run and add tests.
- [Deployment Guide](../06_Deployment_Guide/) — Docker and CI/CD.
