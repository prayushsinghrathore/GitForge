import { motion } from 'framer-motion'
import { GitCommitHorizontal } from 'lucide-react'
import { useBlame } from '@/lib/hooks/queries'
import { relativeTime } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Sidebar panel in the file explorer showing git-blame annotations for each
 * line — which commit, author, and when the line was last changed.
 */
export function BlameAnnotations({ path }: { path: string | null }) {
  const { data, isLoading } = useBlame(path)

  if (!path) return null

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-1.5 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (data.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-muted-foreground">
        <GitCommitHorizontal className="size-5" />
        <p>No blame information available for this file.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <GitCommitHorizontal className="size-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Blame
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim">
        {data.lines.map((line) => (
          <motion.div
            key={line.lineno}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col border-b border-border/20 px-4 py-2 text-xs hover:bg-accent/30"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground/60">
                {line.short_id}
              </span>
              <span className="truncate text-foreground/80">{line.author}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/50 tabular-nums">
                {line.lineno}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
              {line.message}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/40">
              {relativeTime(line.timestamp)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
