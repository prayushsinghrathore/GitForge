import { useState } from 'react'
import { Plus, GitMerge, Check, Loader2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useBranches } from '@/lib/hooks/queries'
import { useCheckout, useCreateBranch, useMerge } from '@/lib/hooks/mutations'
import { laneColor, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'

/**
 * Interactive branch rail. Clicking a branch checks it out; the merge button
 * merges another branch into the current one; the header "+" creates a branch
 * at HEAD. All actions go through the engine's mutation endpoints and invalidate
 * the repo's cached views on success.
 */
export function BranchList({ onNotify }: { onNotify?: (line: string) => void }) {
  const { data: branches } = useBranches()
  const checkout = useCheckout()
  const createBranch = useCreateBranch()
  const merge = useMerge()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const current = branches?.find((b) => b.is_current)?.name ?? null
  const busy = checkout.isPending || createBranch.isPending || merge.isPending

  const notify = (line: string) => onNotify?.(line)

  const handleCheckout = (name: string) => {
    if (name === current || busy) return
    checkout.mutate(
      { name },
      {
        onSuccess: () => notify(`✓ checked out ${name}`),
        onError: (e) => notify(`✗ ${errText(e)}`),
      },
    )
  }

  const handleMerge = (name: string) => {
    merge.mutate(
      { branch: name },
      {
        onSuccess: (c) => notify(`✓ merged ${name} → ${current} (${c.short})`),
        onError: (e) => notify(`✗ ${errText(e)}`),
      },
    )
  }

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    createBranch.mutate(
      { name },
      {
        onSuccess: () => {
          notify(`✓ created branch ${name}`)
          setNewName('')
          setCreating(false)
        },
        onError: (e) => notify(`✗ ${errText(e)}`),
      },
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scroll-slim px-1">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Branches
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground/70">{branches?.length ?? 0}</span>
          <Popover open={creating} onOpenChange={setCreating}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-5 text-muted-foreground">
                <Plus className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60">
              <p className="px-1.5 pb-1.5 text-[11px] font-medium text-muted-foreground">
                New branch at HEAD
              </p>
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="feature/x"
                  className="h-8 w-full rounded-md bg-secondary px-2 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button size="sm" onClick={handleCreate} disabled={createBranch.isPending || !newName.trim()}>
                  {createBranch.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Add'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <ul className="flex flex-col gap-0.5">
        {branches?.map((b, i) => (
          <li key={b.name}>
            <div
              className={cn(
                'group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                b.is_current
                  ? 'bg-accent/60 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <button
                onClick={() => handleCheckout(b.name)}
                disabled={busy}
                className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-60"
                title={b.last_activity ? `Last activity ${relativeTime(b.last_activity)}` : b.name}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: laneColor(i) }}
                />
                <span className="truncate font-mono">{b.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground/60">
                  {b.commit_count}
                </span>
              </button>

              {b.is_current ? (
                <span className="flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                  <Check className="size-2.5" />
                  HEAD
                </span>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleMerge(b.name)}
                      disabled={busy}
                      className="opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-40"
                      aria-label={`Merge ${b.name} into ${current}`}
                    >
                      {merge.isPending && merge.variables?.branch === b.name ? (
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <GitMerge className="size-3.5 text-muted-foreground hover:text-forge-cyan" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Merge into {current}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function errText(e: unknown): string {
  if (e instanceof ApiError) return e.detail ?? e.message
  return e instanceof Error ? e.message : 'Operation failed'
}
