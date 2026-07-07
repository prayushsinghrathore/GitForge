import { useMemo } from 'react'
import {
  GitCommitHorizontal,
  GitBranch,
  Users,
  Database,
  Boxes,
  AlertTriangle,
} from 'lucide-react'
import { useAnalytics } from '@/lib/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { ActivityChart } from './ActivityChart'
import { ContributorsChart } from './ContributorsChart'
import { InsightCard } from '@/components/insights/InsightCard'
import { formatBytes, relativeTime } from '@/lib/format'
import { useRepoStore } from '@/store/useRepoStore'
import type { MostChangedFile } from '@/lib/api/types'

/**
 * Repository analytics: headline stats, an activity-over-time area chart, a
 * per-contributor bar chart, the most-churned files, the largest commits, and
 * the derived insights — all from the single `/analytics` payload.
 */
export function AnalyticsDashboard() {
  const { data, isLoading, isError } = useAnalytics()
  const selectCommit = useRepoStore((s) => s.selectCommit)
  const setPanel = useRepoStore((s) => s.setPanel)

  const stats = useMemo(
    () => [
      { label: 'Commits', value: data?.commit_count, icon: GitCommitHorizontal },
      { label: 'Branches', value: data?.branch_count, icon: GitBranch },
      { label: 'Contributors', value: data?.contributor_count, icon: Users },
      { label: 'Objects', value: data?.object_count, icon: Boxes },
      {
        label: 'Repo size',
        value: data ? formatBytes(data.repository_size_bytes) : undefined,
        icon: Database,
      },
    ],
    [data],
  )

  if (isError) {
    return (
      <div className="grid h-full place-items-center bg-forge-radial p-8">
        <div className="glass flex max-w-md items-center gap-3 rounded-xl p-4 text-sm text-forge-amber">
          <AlertTriangle className="size-5 shrink-0" />
          <span>Couldn't load analytics.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto scroll-slim bg-forge-radial">
      <div className="mx-auto max-w-6xl p-6">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Repository Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Health, activity, and contribution signals derived from full history.
          </p>
        </header>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <Card key={s.label} className="p-4">
                <Icon className="size-4 text-primary" />
                <div className="mt-3 text-2xl font-semibold tabular-nums">
                  {isLoading || s.value === undefined ? (
                    <Skeleton className="h-7 w-14" />
                  ) : (
                    s.value
                  )}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
              </Card>
            )
          })}
        </div>

        {/* Charts */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Commit Activity</h2>
            {isLoading || !data ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <ActivityChart data={data.activity_by_day} />
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Commits by Contributor</h2>
            {isLoading || !data ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <ContributorsChart data={data.commits_per_author} />
            )}
          </Card>
        </div>

        {/* Lists */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Most Changed Files</h2>
            {isLoading || !data ? (
              <ListSkeleton />
            ) : (
              <MostChangedFiles files={data.most_changed_files} />
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Largest Commits</h2>
            {isLoading || !data ? (
              <ListSkeleton />
            ) : data.largest_commits.length === 0 ? (
              <Empty>No commits yet.</Empty>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.largest_commits.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setPanel('graph')
                        selectCommit(c.id)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-accent/50"
                    >
                      <AuthorAvatar name={c.author} size={26} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-foreground">{c.message}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {relativeTime(c.timestamp)}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums">
                        <span className="text-forge-emerald">+{c.insertions}</span>{' '}
                        <span className="text-destructive">-{c.deletions}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Insights */}
        <Card className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-semibold">Insights</h2>
          {isLoading || !data ? (
            <ListSkeleton />
          ) : data.insights.length === 0 ? (
            <Empty>History looks healthy — no flags.</Empty>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {data.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function MostChangedFiles({ files }: { files: MostChangedFile[] }) {
  if (files.length === 0) return <Empty>No file changes recorded.</Empty>
  const max = Math.max(...files.map((f) => f.changes), 1)
  return (
    <ul className="flex flex-col gap-2">
      {files.map((f) => (
        <li key={f.path} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate font-mono text-xs text-foreground" title={f.path}>
            {f.path}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-forge-gradient"
              style={{ width: `${(f.changes / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {f.changes}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-lg" />
      ))}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-xs text-muted-foreground">{children}</p>
}
