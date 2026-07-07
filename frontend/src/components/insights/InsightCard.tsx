import { Info, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { InsightDTO, InsightKind } from '@/lib/api/types'
import { useRepoStore } from '@/store/useRepoStore'
import { cn } from '@/lib/utils'

const KIND: Record<
  InsightKind,
  { icon: React.ComponentType<{ className?: string }>; ring: string; text: string; bg: string }
> = {
  info: { icon: Info, ring: 'border-forge-cyan/30', text: 'text-forge-cyan', bg: 'bg-forge-cyan/10' },
  warning: {
    icon: AlertTriangle,
    ring: 'border-forge-amber/30',
    text: 'text-forge-amber',
    bg: 'bg-forge-amber/10',
  },
  risk: {
    icon: ShieldAlert,
    ring: 'border-destructive/30',
    text: 'text-destructive',
    bg: 'bg-destructive/10',
  },
}

/**
 * A rule-based repository insight (analytics feed). Clicking one that references
 * a commit jumps the selection there so the graph + inspector focus on it.
 */
export function InsightCard({ insight }: { insight: InsightDTO }) {
  const selectCommit = useRepoStore((s) => s.selectCommit)
  const setPanel = useRepoStore((s) => s.setPanel)
  const style = KIND[insight.kind] ?? KIND.info
  const Icon = style.icon
  const clickable = Boolean(insight.commit_id)

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => {
        if (insight.commit_id) {
          setPanel('graph')
          selectCommit(insight.commit_id)
        }
      }}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
        style.ring,
        style.bg,
        clickable ? 'hover:brightness-125' : 'cursor-default',
      )}
    >
      <span className={cn('mt-0.5 shrink-0', style.text)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{insight.title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{insight.detail}</p>
      </div>
    </button>
  )
}
