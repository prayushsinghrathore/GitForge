/**
 * React Query hooks — the single source of truth for server state.
 *
 * Query keys are namespaced by repository so caches never collide, and stale
 * times are generous because a repository's history is immutable between
 * mutations (which invalidate explicitly).
 */
import { useQuery } from '@tanstack/react-query'
import { api, DEFAULT_REPO } from '@/lib/api/endpoints'
import { useRepoStore } from '@/store/useRepoStore'

const FIVE_MIN = 5 * 60 * 1000

export const queryKeys = {
  health: ['health'] as const,
  graph: (repo: string) => ['graph', repo] as const,
  branches: (repo: string) => ['branches', repo] as const,
  status: (repo: string) => ['status', repo] as const,
  analytics: (repo: string) => ['analytics', repo] as const,
  insights: (repo: string) => ['insights', repo] as const,
  commit: (repo: string, id: string) => ['commit', repo, id] as const,
  diff: (repo: string, newId: string, oldId?: string) => ['diff', repo, newId, oldId ?? null] as const,
  fileHistory: (repo: string, path: string) => ['fileHistory', repo, path] as const,
  snapshot: (repo: string, id: string) => ['snapshot', repo, id] as const,
  repos: ['repos'] as const,
  blame: (repo: string, path: string) => ['blame', repo, path] as const,
}

export function useHealth() {
  return useQuery({ queryKey: queryKeys.health, queryFn: api.health, staleTime: FIVE_MIN })
}

export function useGraph(repo: string = DEFAULT_REPO) {
  return useQuery({
    queryKey: queryKeys.graph(repo),
    queryFn: () => api.graph(repo),
    staleTime: FIVE_MIN,
  })
}

export function useBranches(repo: string = DEFAULT_REPO) {
  return useQuery({
    queryKey: queryKeys.branches(repo),
    queryFn: () => api.branches(repo),
    staleTime: FIVE_MIN,
  })
}

export function useAnalytics(repo: string = DEFAULT_REPO) {
  return useQuery({
    queryKey: queryKeys.analytics(repo),
    queryFn: () => api.analytics(repo),
    staleTime: FIVE_MIN,
  })
}

export function useInsights(repo: string = DEFAULT_REPO) {
  return useQuery({
    queryKey: queryKeys.insights(repo),
    queryFn: () => api.insights(repo),
    staleTime: FIVE_MIN,
  })
}

export function useCommit(commitId: string | null, repo: string = DEFAULT_REPO) {
  return useQuery({
    queryKey: queryKeys.commit(repo, commitId ?? ''),
    queryFn: () => api.commit(repo, commitId as string),
    enabled: Boolean(commitId),
    staleTime: FIVE_MIN,
  })
}

/** Full file snapshot at a commit (diff from empty tree → commit). */
export function useSnapshot(commitId: string | null, repo: string = DEFAULT_REPO) {
  return useQuery({
    queryKey: queryKeys.snapshot(repo, commitId ?? ''),
    queryFn: () => api.diff(repo, commitId as string),
    enabled: Boolean(commitId),
    staleTime: FIVE_MIN,
  })
}

export function useFileHistory(path: string | null, repo: string = DEFAULT_REPO) {
  return useQuery({
    queryKey: queryKeys.fileHistory(repo, path ?? ''),
    queryFn: () => api.fileHistory(repo, path as string),
    enabled: Boolean(path),
    staleTime: FIVE_MIN,
  })
}

export function useListRepos() {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: () => api.listRepos(),
    staleTime: FIVE_MIN,
  })
}

export function useBlame(path: string | null, repo?: string) {
  const activeRepo = repo ?? useRepoStore((s) => s.repo)
  return useQuery({
    queryKey: queryKeys.blame(activeRepo, path ?? ''),
    queryFn: () => api.blame(activeRepo, path as string),
    enabled: Boolean(path),
    staleTime: FIVE_MIN,
  })
}
