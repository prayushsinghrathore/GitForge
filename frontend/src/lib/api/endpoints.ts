/**
 * Typed endpoint functions — one per API route.
 *
 * Every function is a thin, fully-typed wrapper over {@link http}. Components
 * never build URLs themselves; they call these. The `repo` argument defaults to
 * `demo`, the auto-seeded repository.
 */
import { http } from './client'
import type {
  BranchDTO,
  BranchRequest,
  CommitDTO,
  CommitGraphDTO,
  CommitInspectorDTO,
  CommitRequest,
  DiffFileDTO,
  FileHistoryDTO,
  HealthDTO,
  MergeRequest,
  OkDTO,
  RepoOverviewDTO,
  InsightDTO,
  StageRequest,
  StatusDTO,
} from './types'

const repoBase = (repo: string) => `/repos/${encodeURIComponent(repo)}`

export const api = {
  // ── meta ──────────────────────────────────────────────────────────────────
  health: () => http.get<HealthDTO>('/health'),
  listRepos: () => http.get<{ repositories: string[] }>('/repos'),

  // ── graph & history ───────────────────────────────────────────────────────
  graph: (repo: string) => http.get<CommitGraphDTO>(`${repoBase(repo)}/graph`),
  log: (repo: string, branch?: string) =>
    http.get<CommitDTO[]>(`${repoBase(repo)}/log`, { branch }),
  branches: (repo: string) => http.get<BranchDTO[]>(`${repoBase(repo)}/branches`),
  status: (repo: string) => http.get<StatusDTO>(`${repoBase(repo)}/status`),

  // ── inspection ────────────────────────────────────────────────────────────
  commit: (repo: string, commitId: string) =>
    http.get<CommitInspectorDTO>(`${repoBase(repo)}/commits/${commitId}`),
  diff: (repo: string, newId: string, oldId?: string) =>
    http.get<DiffFileDTO[]>(`${repoBase(repo)}/diff`, { new: newId, old: oldId }),
  fileHistory: (repo: string, path: string) =>
    http.get<FileHistoryDTO>(`${repoBase(repo)}/files/history`, { path }),

  // ── analytics ─────────────────────────────────────────────────────────────
  analytics: (repo: string) => http.get<RepoOverviewDTO>(`${repoBase(repo)}/analytics`),
  insights: (repo: string) => http.get<InsightDTO[]>(`${repoBase(repo)}/insights`),

  // ── mutations ─────────────────────────────────────────────────────────────
  stage: (repo: string, body: StageRequest) =>
    http.post<OkDTO>(`${repoBase(repo)}/stage`, body),
  commitChanges: (repo: string, body: CommitRequest) =>
    http.post<CommitDTO>(`${repoBase(repo)}/commit`, body),
  createBranch: (repo: string, body: BranchRequest) =>
    http.post<OkDTO>(`${repoBase(repo)}/branches`, body),
  checkout: (repo: string, body: BranchRequest) =>
    http.post<OkDTO>(`${repoBase(repo)}/checkout`, body),
  merge: (repo: string, body: MergeRequest) =>
    http.post<CommitDTO>(`${repoBase(repo)}/merge`, body),
}

export const DEFAULT_REPO = 'demo'
