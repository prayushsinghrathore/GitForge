/**
 * TypeScript mirrors of the backend Pydantic DTOs (app/dto/schemas.py).
 *
 * These are the transport contract. They are kept in lock-step with the API;
 * any change to a backend DTO must be reflected here and in 04_API_Documentation.
 */

// ── core commit ─────────────────────────────────────────────────────────────
export interface CommitDTO {
  id: string
  short: string
  parents: string[]
  author: string
  message: string
  timestamp: number // unix seconds
  is_merge: boolean
  files_changed: number
  insertions: number
  deletions: number
}

export interface BranchDTO {
  name: string
  tip: string | null
  short_tip: string | null
  is_current: boolean
  commit_count: number
  last_activity: number | null
}

export interface StatusDTO {
  branch: string | null
  staged_new: string[]
  staged_modified: string[]
  deleted: string[]
}

// ── graph (React Flow friendly) ─────────────────────────────────────────────
export interface CommitNodeDTO {
  id: string
  short: string
  author: string
  message: string
  timestamp: number
  is_merge: boolean
  is_head: boolean
  branch: string | null // branch name if this commit is a branch tip
  lane: number // horizontal track for graph layout
  row: number // vertical position (0 = newest)
  files_changed: number
  insertions: number
  deletions: number
  insights: string[]
}

export interface CommitEdgeDTO {
  source: string // child commit id
  target: string // parent commit id
  is_merge: boolean
}

export interface CommitGraphDTO {
  nodes: CommitNodeDTO[]
  edges: CommitEdgeDTO[]
  head: string | null
  lane_count: number
}

// ── diff / inspector ────────────────────────────────────────────────────────
export type DiffOp = 'equal' | 'add' | 'remove'

export interface DiffLineDTO {
  op: DiffOp
  old_lineno: number | null
  new_lineno: number | null
  text: string
}

export interface DiffFileDTO {
  path: string
  insertions: number
  deletions: number
  lines: DiffLineDTO[]
}

export interface CommitInspectorDTO {
  commit: CommitDTO
  files: DiffFileDTO[]
  insights: string[]
}

export interface FileHistoryDTO {
  path: string
  commits: CommitDTO[]
}

// ── analytics / insights ────────────────────────────────────────────────────
export type InsightKind = 'info' | 'warning' | 'risk'

export interface InsightDTO {
  kind: InsightKind
  title: string
  detail: string
  commit_id: string | null
}

export interface MostChangedFile {
  path: string
  changes: number
}

export interface RepoOverviewDTO {
  commit_count: number
  branch_count: number
  current_branch: string | null
  object_count: number
  repository_size_bytes: number
  contributor_count: number
  last_commit: CommitDTO | null
  commits_per_author: Record<string, number>
  activity_by_day: Record<string, number> // ISO date -> commit count
  most_changed_files: MostChangedFile[]
  largest_commits: CommitDTO[]
  insights: InsightDTO[]
}

// ── request bodies ──────────────────────────────────────────────────────────
export interface StageRequest {
  path: string
  content?: string
}

export interface CommitRequest {
  message: string
  author?: string
}

export interface BranchRequest {
  name: string
  at?: string | null
}

export interface MergeRequest {
  branch: string
  author?: string
}

export interface RestoreRequest {
  path: string
  commit_id?: string | null
}

export interface ImportRepoRequest {
  repo_url: string
  name?: string | null
}

export interface ImportStatusDTO {
  name: string
  commit_count: number
  status: string
}

// ── blame ────────────────────────────────────────────────────────────────────
export interface BlameLineDTO {
  lineno: number
  content: string
  commit_id: string
  short_id: string
  author: string
  timestamp: number
  message: string
}

export interface BlameFileDTO {
  path: string
  lines: BlameLineDTO[]
}

// ── meta ────────────────────────────────────────────────────────────────────
export interface HealthDTO {
  status: string
  service: string
}

export interface OkDTO {
  ok: boolean
}
