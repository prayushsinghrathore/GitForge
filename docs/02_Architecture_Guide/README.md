# GitForge Architecture Guide

System design with Mermaid diagrams, layer descriptions, data flow, and the rationale behind each architectural decision.

> **Prerequisites:** [Concept Handbook](../01_Concept_Handbook/) for foundational concepts.

---

## Table of Contents

1. [Overall System Architecture](#1-overall-system-architecture)
2. [Backend Layers](#2-backend-layers)
3. [Frontend Layers](#3-frontend-layers)
4. [Data Flow](#4-data-flow)
5. [Repository Lifecycle](#5-repository-lifecycle)
6. [Import Flow](#6-import-flow)
7. [Blame Flow](#7-blame-flow)
8. [Restore Flow](#8-restore-flow)
9. [Analytics Pipeline](#9-analytics-pipeline)
10. [React Query Flow](#10-react-query-flow)
11. [Zustand Store](#11-zustand-store)
12. [Object Storage](#12-object-storage)

---

## 1. Overall System Architecture

```mermaid
graph TB
    User["User (Browser)"] --> Frontend["React + TypeScript Frontend<br/>:5173 (dev) / :80 (prod)"]

    Frontend --> API["FastAPI Backend<br/>:8000"]

    subgraph "Backend Layer"
        API --> Routes["API Routes<br/>(routes.py)"]
        Routes --> Services["Service Layer<br/>(services/)"]
        Services --> Engine["VCS Engine<br/>(core/)"]
        Engine --> Store["SQLite Object Store<br/>(store.db)"]
    end

    subgraph "Frontend Layer"
        Frontend --> ReactQuery["React Query Cache<br/>(queries.ts)"]
        Frontend --> Zustand["Zustand Store<br/>(useRepoStore.ts)"]
        ReactQuery --> Components["React Components<br/>(components/)"]
        Zustand --> Components
    end
```

### Technology stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | React 19 + TypeScript | Component-based UI |
| Build tool | Vite 8 | Fast dev server + optimized builds |
| Styling | TailwindCSS 3 + `tailwindcss-animate` | Utility-first CSS |
| Animations | Framer Motion 12 | Smooth transitions |
| Graph visualization | React Flow (xyflow) 12 | Interactive commit DAG |
| Charts | Recharts 3 | Analytics dashboard |
| State (server) | TanStack React Query 5 | Cached server state |
| State (UI) | Zustand 5 | Ephemeral view state |
| Backend framework | FastAPI (Python 3.12) | Type-safe REST API |
| Database | SQLite 3 | Embedded object store |
| Container | Docker + docker-compose | Consistent deployment |

---

## 2. Backend Layers

```mermaid
graph TD
    subgraph "Backend Layers"
        direction TB
        L1["API Layer<br/>(api/routes.py + api/main.py)<br/>Thin endpoints, param validation, HTTP codes"]
        L2["DTO Layer<br/>(dto/schemas.py)<br/>Request/response contracts (Pydantic)"]
        L3["Service Layer<br/>(services/)<br/>Business logic, engine → DTO mapping"]
        L4["Engine Layer<br/>(core/)<br/>VCS primitives (framework-free)"]
        L5["Storage Layer<br/>(SQLite)<br/>Object persistence"]
    end

    L1 --> L2 --> L3 --> L4 --> L5
```

### API layer (`app/api/`)

| File | Responsibility |
|------|---------------|
| `routes.py` | 16 thin endpoints: parse params, call service, return DTO |
| `dependencies.py` | FastAPI `Depends` wiring; creates `RepoService` per request |
| `main.py` | App factory, lifespan (provider init), CORS, two top-level routes |

### DTO layer (`app/dto/`)

All request/response models are Pydantic `BaseModel` subclasses. They:
- Validate input at the API boundary.
- Define the exact JSON contract the frontend receives.
- Keep transport shapes independent of engine internals.

### Service layer (`app/services/`)

| Service | Methods | Purpose |
|---------|---------|---------|
| `RepoService` | `stage`, `commit`, `log`, `branches`, `status`, `diff`, `file_history`, `merge`, `blame`, `restore`, `inspect_commit`, `create_branch`, `checkout` | Primary repository operations |
| `GraphService` | `build_graph` | Build React Flow DTO with lane layout |
| `AnalyticsService` | `overview` | Stats, heatmaps, contributor metrics |
| `InsightService` | `commit_insights`, `repo_insights` | Rule-based heuristics per commit |
| `import_service` | `import_github` | Clone + replay external repos |

### Engine layer (`app/core/`)

| Module | File | Dependencies |
|--------|------|-------------|
| `hashing` | `hashing.py` | `hashlib` |
| `objects` | `objects.py` | `hashing` |
| `object_store` | `object_store.py` | `objects`, `sqlite3` |
| `refs` | `refs.py` | SQLite |
| `index` | `index.py` | SQLite |
| `diff` | `diff.py` | None (pure algorithm) |
| `dag` | `dag.py` | `objects` |
| `merge` | `merge.py` | `diff` |
| `repository` | `repository.py` | All of the above |

---

## 3. Frontend Layers

```mermaid
graph TD
    subgraph "Frontend Layers"
        direction TB
        FL1["Components Layer<br/>(components/)<br/>React views, animations, gestures"]
        FL2["Store Layer<br/>(store/ + lib/hooks/)<br/>Zustand (UI state) + React Query (server state)"]
        FL3["API Layer<br/>(lib/api/)<br/>endpoints.ts + types.ts + client.ts"]
    end

    FL1 --> FL2 --> FL3
```

### Component hierarchy

```
App
├── Providers (QueryClient, TooltipProvider)
├── AppShell
│   ├── Sidebar
│   │   ├── Brand
│   │   ├── Nav (graph / files / analytics)
│   │   ├── BranchList
│   │   └── Footer actions (search, timemachine, import, palette)
│   ├── TopBar
│   │   ├── Repo identity + RepoSwitcher
│   │   ├── Search trigger
│   │   └── Time Machine + ⌘K buttons
│   ├── MainPanel (router)
│   │   ├── CommitGraph (React Flow DAG)
│   │   ├── FileExplorer (file tree + content + history)
│   │   │   └── BlameAnnotations (per-line blame)
│   │   ├── AnalyticsDashboard (charts + stats)
│   │   └── WelcomeStage (landing screen)
│   ├── RightPanel
│   │   └── RightPanelContent
│   │       ├── CommitInspector (commit details + diff)
│   │       └── InsightsFeed
│   └── BottomBar (activity log)
├── CommandPalette (⌘K)
└── ImportRepoDialog (modal)
```

### UI primitives (`components/ui/`)

```
badge.tsx    button.tsx    card.tsx    dialog.tsx
popover.tsx  scroll-area.tsx  separator.tsx  skeleton.tsx  tooltip.tsx
```

These are shadcn-style Radix primitives reused across the app.

---

## 4. Data Flow

### Read path (e.g., loading the commit graph)

```mermaid
sequenceDiagram
    participant User
    participant CommitGraph as CommitGraph (component)
    participant useGraph as useGraph() (React Query)
    participant api as api.graph() (endpoints)
    participant Backend as FastAPI Backend
    participant RepoService as RepoService
    participant Engine as VCS Engine

    User->>CommitGraph: Navigate to graph panel
    CommitGraph->>useGraph: Mount (query key: ['graph', repo])
    useGraph->>api: fetch('/api/repos/demo/graph')
    api->>Backend: GET /api/repos/demo/graph
    Backend->>RepoService: RepoService(repo).log()
    RepoService->>Engine: repo.log() → [CommitInfo]
    Engine-->>RepoService: Return commit list
    RepoService-->>Backend: Convert CommitInfo → CommitDTO[]
    Backend-->>api: JSON response
    api-->>useGraph: CommitGraphDTO
    useGraph-->>CommitGraph: Re-render with data
    CommitGraph-->>User: Interactive DAG displayed
```

### Write path (e.g., creating a commit)

```mermaid
sequenceDiagram
    participant User
    participant TopBar
    participant useStage as useStage() (mutation)
    participant useCommit as useCommit() (mutation)
    participant api as endpoints
    participant Backend as FastAPI
    participant Engine as VCS Engine
    participant QueryClient as React Query Client

    User->>TopBar: Stage file
    TopBar->>useStage: mutate({path, content})
    useStage->>api: POST /api/repos/demo/stage
    api->>Backend: Stage file
    Backend->>Engine: repo.stage_file(path, content)
    Engine-->>Backend: OK
    Backend-->>api: {"ok": true}
    useStage->>QueryClient: invalidate(['graph', repo], ['branches', repo], ...)

    User->>TopBar: Commit
    TopBar->>useCommit: mutate({message, author})
    useCommit->>api: POST /api/repos/demo/commit
    api->>Backend: Commit staged changes
    Backend->>Engine: repo.commit(message, author, timestamp)
    Engine->>Engine: Build tree, create commit object, advance ref
    Engine-->>Backend: CommitDTO
    Backend-->>api: Commit data
    useCommit->>QueryClient: invalidate all repo queries
```

---

## 5. Repository Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: provider.create(name)
    Created --> Active: stage file
    Active --> Active: stage → commit → branch → checkout → merge
    Active --> Imported: import_github(url)
    Imported --> Active: normal operations
    Active --> Deleted: provider clears data_dir
    Deleted --> [*]
```

---

## 6. Import Flow

When a user imports a GitHub repository:

```mermaid
flowchart TD
    User["User submits URL"] --> Validate["Validate URL format<br/>(_extract_repo_name)"]
    Validate -->|Invalid| 422["Return HTTP 422<br/>with error detail"]
    Validate -->|Valid| Clone["git clone --bare<br/>(into temp dir)"]
    Clone -->|Fails| 500["Return HTTP 500"]
    Clone -->|Success| RevList["git rev-list --topo-order --reverse --all<br/>(oldest-first commit list)"]
    RevList --> BranchMap["git for-each-ref refs/heads<br/>(branch name → SHA mapping)"]
    BranchMap --> Create["provider.create(repo_name)<br/>(Creates empty GitForge repo)"]
    Create --> Replay["For each SHA (oldest → newest):"]
    Replay --> GetMeta["git log --format<br/>(author, timestamp, message)"]
    GetMeta --> GetFiles["git ls-tree -r -z<br/>(null-delimited file list)"]
    GetFiles --> GetBlob["For each file:<br/>git show SHA:path<br/>(blob content)"]
    GetBlob --> StageCommit["repo.stage_file()<br/>repo.commit()"]
    StageCommit --> Replay
    Replay --> BranchSetup["Create imported branches<br/>Checkout default branch"]
    BranchSetup --> Cleanup["rm -rf tempdir"]
    Cleanup --> Done["Return ImportStatusDTO<br/>(name, commit_count)"]
```

---

## 7. Blame Flow

When a user requests blame on a file:

```mermaid
flowchart TD
    Start["GET /blame?path=README.md"] --> FileHistory["repo.file_history(path)<br/>(commits that changed the file)"]
    FileHistory -->|No commits| Empty["Return empty BlameFileDTO"]
    FileHistory --> HeadContent["repo.file_content(path, HEAD)<br/>(current file content)"]
    HeadContent --> Init["Initialize blame_owner[i] = HEAD<br/>for each line"]
    Init --> Walk["Walk history backward,<br/>diffing consecutive pairs"]
    Walk --> Diff["repo.diff_commits(older, newer)<br/>→ FileDiff"]
    Diff --> Annotate["EQUAL lines → push blame to older commit<br/>ADD lines → keep blame at newer commit<br/>REMOVE lines → skip"]
    Annotate --> Walk
    Walk --> Enrich["Enrich each line with:<br/>commit_id, author, timestamp, message"]
    Enrich --> Return["Return BlameFileDTO"]
```

---

## 8. Restore Flow

When a user restores a file from history:

```mermaid
flowchart TD
    Start["POST /restore<br/>{path: 'src/core.py', commit_id: 'abc123'}"] --> Lookup["repo._commit_file_map(commit_id)<br/>(files at that point in history)"]
    Lookup -->|Not found| Error404["409: file not found in commit"]
    Lookup --> Found["Get file bytes from blob store"]
    Found --> Stage["repo.stage_file(path, content)<br/>(re-stage recovered content)"]
    Stage --> Done["Return {'ok': true}"]
```

---

## 9. Analytics Pipeline

```mermaid
flowchart TD
    Analytics["GET /analytics"] --> Log["repo.log()<br/>(all commits on HEAD)"]
    Log --> CommitCount["commit_count = len(log)"]
    Log --> Contributors["contributor_count = len(set(authors))"]
    Log --> Activity["activity_by_day = {date: count}<br/>(heatmap data)"]
    Log --> FileChanges["most_changed_files = top-N by change count"]
    Log --> LargestCommits["largest_commits = top-N by insertions+deletions"]
    Branches["repo.refs.list_branches()"] --> BranchCount["branch_count"]
    Objects["repo.objects.count()"] --> ObjectCount["object_count"]
    Objects --> Size["repository_size_bytes"]
    Head["repo.refs.head_commit()"] --> Longest["Last commit + current branch"]
    CommitCount --> Combine["Aggregate into RepoOverviewDTO"]
    BranchCount --> Combine
    ObjectCount --> Combine
    Size --> Combine
    Longest --> Combine
    Contributors --> Combine
    Activity --> Combine
    FileChanges --> Combine
```

---

## 10. React Query Flow

```mermaid
graph TD
    subgraph "React Query Cache"
        QK1["['graph', 'demo'] → CommitGraphDTO"]
        QK2["['branches', 'demo'] → BranchDTO[]"]
        QK3["['analytics', 'demo'] → RepoOverviewDTO"]
        QK4["['commit', 'demo', 'abc'] → CommitInspectorDTO"]
        QK5["['blame', 'demo', 'README.md'] → BlameFileDTO"]
    end

    subgraph "Mutations"
        M1["useStage()"]
        M2["useCommit()"]
        M3["useCreateBranch()"]
        M4["useCheckout()"]
        M5["useMerge()"]
        M6["useRestore()"]
    end

    M1 -->|onSuccess| Invalidate["Invalidate all repo queries:<br/>graph, branches, status,<br/>analytics, insights, blame"]
    M2 --> Invalidate
    M3 --> Invalidate
    M4 --> Invalidate
    M5 --> Invalidate
    M6 --> Invalidate
```

Query keys are namespaced by repository name, so switching repos transparently re-fetches with the correct cache namespace. Stale time is generous (5 minutes) because a repository's history is immutable between mutations.

---

## 11. Zustand Store

The Zustand store holds only **ephemeral UI state**. All server data lives in React Query.

```typescript
interface RepoState {
  // Current repository
  repo: string

  // Selection / hover
  selectedCommitId: string | null
  hoveredCommitId: string | null
  inspectorOpen: boolean

  // Navigation
  activePanel: 'graph' | 'analytics' | 'files'
  activeBranch: string | null

  // Search
  searchQuery: string
  searchOpen: boolean

  // Command palette
  paletteOpen: boolean

  // Import dialog
  importDialogOpen: boolean

  // Activity log (mutation feedback in BottomBar)
  activity: string[]

  // Time Machine
  timeMachine: {
    enabled: boolean
    cursor: number  // unix seconds
    playing: boolean
    speed: number
  }
}
```

### State model rule

> **Server data** lives in React Query (async, cached, stale-aware).  
> **UI state** lives in Zustand (sync, derived, view-local).  
> **Time Machine cursor** is pure derived state — it filters the React Query cache by timestamp.

---

## 12. Object Storage

### Physical layout

```
<data_dir>/<name>.gitforge/store.db
```

A single SQLite file contains everything:

| Table | Rows | Purpose |
|-------|------|---------|
| `objects` | Object count | Full content-addressable object store |
| `refs` | Branch count | Branch name → commit hash |
| `head` | 1–2 | Current branch + optional detached HEAD |
| `index` | Staged files | Path → blob hash for staging area |

### Object lifecycle

```mermaid
flowchart LR
    File["File on disk"] -->|stage_file| Blob["Blob (content hashed)"]
    Blob -->|put| Store["ObjectStore (SQLite)"]
    Commit["Commit created"] -->|put| Store
    Tree["Tree built from index"] -->|put| Store
    Store -->|get| Read["Read objects by hash"]
```

---

## Further reading

- [Concept Handbook](../01_Concept_Handbook/) — Foundational concepts.
- [Developer Guide](../03_Developer_Guide/) — Per-module reference.
- [API Documentation](../04_API_Documentation/) — Endpoint specifications.
