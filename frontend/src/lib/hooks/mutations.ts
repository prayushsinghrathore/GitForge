/**
 * Mutation hooks — the write path into the engine.
 *
 * Every repository mutation (branch, checkout, merge, stage, commit) changes
 * history or refs, so on success we invalidate the whole repo namespace: the
 * graph, branches, analytics, insights, and status all re-fetch. Engine-level
 * failures arrive as {@link ApiError} (HTTP 409) carrying a human-readable
 * `detail`, which callers can surface directly.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, DEFAULT_REPO } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/hooks/queries'
import type {
  BranchRequest,
  CommitRequest,
  ImportRepoRequest,
  MergeRequest,
  RestoreRequest,
  StageRequest,
} from '@/lib/api/types'

/** Invalidate everything scoped to a repository after a mutation. */
function useRepoInvalidator(repo: string) {
  const qc = useQueryClient()
  return () => {
    for (const key of ['graph', 'branches', 'status', 'analytics', 'insights'] as const) {
      qc.invalidateQueries({ queryKey: [key, repo] })
    }
  }
}

export function useStage(repo: string = DEFAULT_REPO) {
  const invalidate = useRepoInvalidator(repo)
  return useMutation({
    mutationFn: (body: StageRequest) => api.stage(repo, body),
    onSuccess: invalidate,
  })
}

export function useCommit(repo: string = DEFAULT_REPO) {
  const invalidate = useRepoInvalidator(repo)
  return useMutation({
    mutationFn: (body: CommitRequest) => api.commitChanges(repo, body),
    onSuccess: invalidate,
  })
}

export function useCreateBranch(repo: string = DEFAULT_REPO) {
  const invalidate = useRepoInvalidator(repo)
  return useMutation({
    mutationFn: (body: BranchRequest) => api.createBranch(repo, body),
    onSuccess: invalidate,
  })
}

export function useCheckout(repo: string = DEFAULT_REPO) {
  const invalidate = useRepoInvalidator(repo)
  return useMutation({
    mutationFn: (body: BranchRequest) => api.checkout(repo, body),
    onSuccess: invalidate,
  })
}

export function useMerge(repo: string = DEFAULT_REPO) {
  const invalidate = useRepoInvalidator(repo)
  return useMutation({
    mutationFn: (body: MergeRequest) => api.merge(repo, body),
    onSuccess: invalidate,
  })
}

export function useRestore(repo: string = DEFAULT_REPO) {
  const qc = useQueryClient()
  const invalidate = useRepoInvalidator(repo)
  return useMutation({
    mutationFn: (body: RestoreRequest) => api.restore(repo, body),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['blame', repo] })
    },
  })
}

export function useImportRepo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ImportRepoRequest) => api.importGithub(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repos })
    },
  })
}
