import { Sparkles } from 'lucide-react'
import { InsightCard } from './InsightCard'
import { useInsights } from '@/lib/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The default right-panel content: a live feed of repository-wide insights the
 * engine derives from history (large commits, merges, risky churn, …).
 * Self-contained: owns its header and scroll region.
 */
export function InsightsFeed() {
  const { data, isLoading, isError } = useInsights()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3.5">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Developer Insights</h2>
        {data && data.length > 0 && (
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
            {data.length}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim">
        <Body data={data} isLoading={isLoading} isError={isError} />
      </div>
    </div>
  )
}

function Body({
  data,
  isLoading,
  isError,
}: {
  data: ReturnType<typeof useInsights>['data']
  isLoading: boolean
  isError: boolean
}) {
  if (isError) {
    return <p className="p-4 text-sm text-forge-amber">Couldn't load insights.</p>
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
        <Sparkles className="size-6 text-primary/60" />
        <p className="text-sm">No insights yet — history looks healthy.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {data.map((insight, i) => (
        <InsightCard key={i} insight={insight} />
      ))}
    </div>
  )
}
