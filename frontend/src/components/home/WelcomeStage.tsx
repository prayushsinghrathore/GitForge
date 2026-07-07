import { motion } from 'framer-motion'
import { GitCommitHorizontal, GitBranch, Users, Database, AlertTriangle } from 'lucide-react'
import { BrandMark } from '@/components/layout/Brand'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalytics } from '@/lib/hooks/queries'
import { formatBytes } from '@/lib/format'

/**
 * Phase-0 landing stage: confirms the frontend ↔ backend pipeline end-to-end by
 * rendering live repository stats. Phase 1 mounts the commit graph in its place.
 */
export function WelcomeStage() {
  const { data, isLoading, isError } = useAnalytics()

  const stats = [
    { label: 'Commits', value: data?.commit_count, icon: GitCommitHorizontal },
    { label: 'Branches', value: data?.branch_count, icon: GitBranch },
    { label: 'Contributors', value: data?.contributor_count, icon: Users },
    {
      label: 'Repo size',
      value: data ? formatBytes(data.repository_size_bytes) : undefined,
      icon: Database,
    },
  ]

  return (
    <div className="grid h-full place-items-center bg-forge-radial p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-3xl text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary/10 shadow-glow"
        >
          <BrandMark className="h-9 w-9" />
        </motion.div>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Git<span className="text-gradient">Forge</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
          A Git-inspired version control system with interactive repository
          visualization and developer insights.
        </p>

        {isError ? (
          <div className="glass mx-auto mt-8 flex max-w-md items-center gap-3 rounded-xl p-4 text-sm text-forge-amber">
            <AlertTriangle className="size-5 shrink-0" />
            <span className="text-left">
              Can't reach the GitForge engine. Start the backend on{' '}
              <code className="font-mono">:8000</code> and reload.
            </span>
          </div>
        ) : (
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                  className="glass rounded-xl p-4 text-left"
                >
                  <Icon className="size-4 text-primary" />
                  <div className="mt-3 text-2xl font-semibold tabular-nums">
                    {isLoading || s.value === undefined ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      s.value
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        <p className="mt-10 text-xs text-muted-foreground/70">
          Press <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono">⌘K</kbd> for the
          command palette · <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono">/</kbd>{' '}
          to search
        </p>
      </motion.div>
    </div>
  )
}
