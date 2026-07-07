import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitMerge, GitCommitHorizontal } from 'lucide-react'
import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { laneColor, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CommitNodeDTO } from '@/lib/api/types'

export interface CommitNodeData extends Record<string, unknown> {
  commit: CommitNodeDTO
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

/**
 * A single commit rendered as a React Flow node: a lane-colored dot on the left
 * with edges attaching to it, and a glass card carrying the message, author,
 * and change counts. HEAD and branch tips get badges.
 */
export const CommitNode = memo(function CommitNode({ data }: NodeProps) {
  const { commit, selected, dimmed, onSelect, onHover } = data as CommitNodeData
  const color = laneColor(commit.lane)

  return (
    <div
      className={cn(
        'group flex items-center gap-3 transition-opacity duration-300',
        dimmed && 'opacity-30',
      )}
      onMouseEnter={() => onHover(commit.id)}
      onMouseLeave={() => onHover(null)}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(commit.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(commit.id)
        }
      }}
    >
      {/* Edges connect through these handles; kept invisible. */}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />

      {/* Lane dot */}
      <span className="relative grid size-6 shrink-0 place-items-center">
        <span
          className={cn(
            'grid size-6 place-items-center rounded-full transition-transform duration-200',
            'group-hover:scale-110',
          )}
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}, color-mix(in srgb, ${color} 55%, black))`,
            boxShadow: selected
              ? `0 0 0 3px color-mix(in srgb, ${color} 55%, transparent), 0 0 16px -2px ${color}`
              : `0 0 0 1px color-mix(in srgb, ${color} 40%, transparent)`,
          }}
        >
          {commit.is_merge ? (
            <GitMerge className="size-3 text-white" />
          ) : (
            <GitCommitHorizontal className="size-3 text-white/90" />
          )}
        </span>
      </span>

      {/* Card */}
      <div
        className={cn(
          'glass flex min-w-[240px] max-w-[340px] items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-200',
          'group-hover:border-primary/40 group-hover:shadow-glow',
          selected && 'border-primary/60 shadow-glow',
        )}
      >
        <AuthorAvatar name={commit.author} size={22} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-foreground">
              {commit.message || '(no message)'}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-mono text-muted-foreground/80">{commit.short}</span>
            <span>·</span>
            <span className="truncate">{relativeTime(commit.timestamp)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {(commit.is_head || commit.branch) && (
            <div className="flex items-center gap-1">
              {commit.branch && (
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[9px] font-medium"
                  style={{
                    background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    color,
                  }}
                >
                  {commit.branch}
                </span>
              )}
              {commit.is_head && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                  HEAD
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums">
            <span className="text-forge-emerald">+{commit.insertions}</span>
            <span className="text-destructive">-{commit.deletions}</span>
          </div>
        </div>
      </div>
    </div>
  )
})
