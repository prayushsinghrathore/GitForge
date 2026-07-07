import { motion } from 'framer-motion'
import { X, GitCommitHorizontal, GitMerge, Hash, Clock, FileDiff } from 'lucide-react'
import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { DiffView } from '@/components/diff/DiffView'
import { InsightPill } from '@/components/insights/InsightPill'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useCommit } from '@/lib/hooks/queries'
import { useRepoStore } from '@/store/useRepoStore'
import { formatDateTime, relativeTime } from '@/lib/format'

/**
 * Right-panel detail view for the selected commit. Fetches the full inspector
 * payload (metadata + per-file diff + insights) and renders it. Empty state
 * invites the user to pick a commit from the graph.
 */
export function CommitInspector() {
  const selectedId = useRepoStore((s) => s.selectedCommitId)
  const selectCommit = useRepoStore((s) => s.selectCommit)
  const { data, isLoading, isError } = useCommit(selectedId)

  if (!selectedId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10">
          <GitCommitHorizontal className="size-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">No commit selected</p>
        <p className="max-w-[220px] text-xs">
          Click any node in the graph to inspect its changes, author, and insights.
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-forge-amber">Failed to load commit details.</div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  const { commit, files, insights } = data

  return (
    <motion.div
      key={commit.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-border/50 p-4">
        <AuthorAvatar name={commit.author} size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{commit.message}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{commit.author}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => selectCommit(null)}
          className="text-muted-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 border-b border-border/50 p-4 text-xs">
        <Meta icon={Hash} label="Commit">
          <span className="font-mono">{commit.short}</span>
        </Meta>
        <Meta icon={commit.is_merge ? GitMerge : GitCommitHorizontal} label="Type">
          {commit.is_merge ? 'Merge' : 'Standard'}
        </Meta>
        <Meta icon={Clock} label="When">
          <span title={formatDateTime(commit.timestamp)}>{relativeTime(commit.timestamp)}</span>
        </Meta>
        <Meta icon={FileDiff} label="Changes">
          <span className="text-forge-emerald">+{commit.insertions}</span>{' '}
          <span className="text-destructive">-{commit.deletions}</span>
        </Meta>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-1.5 border-b border-border/50 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Insights
          </p>
          {insights.map((text, i) => (
            <InsightPill key={i} text={text} />
          ))}
        </div>
      )}

      {/* Parents */}
      {commit.parents.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/50 px-4 py-3 text-xs text-muted-foreground">
          <span className="text-[10px] font-semibold uppercase tracking-widest">Parents</span>
          {commit.parents.map((p) => (
            <button
              key={p}
              onClick={() => selectCommit(p)}
              className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:bg-accent"
            >
              {p.slice(0, 8)}
            </button>
          ))}
        </div>
      )}

      {/* Files / diff */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {files.length} file{files.length === 1 ? '' : 's'} changed
        </p>
        <DiffView files={files} />
      </div>
    </motion.div>
  )
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </span>
      <span className="text-foreground">{children}</span>
    </div>
  )
}
