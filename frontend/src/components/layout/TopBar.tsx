import { Command, Search, History, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RepoSwitcher } from './RepoSwitcher'
import { useRepoStore } from '@/store/useRepoStore'
import { useAnalytics } from '@/lib/hooks/queries'
import { cn } from '@/lib/utils'

export function TopBar() {
  const togglePalette = useRepoStore((s) => s.togglePalette)
  const setSearchOpen = useRepoStore((s) => s.setSearchOpen)
  const toggleTimeMachine = useRepoStore((s) => s.toggleTimeMachine)
  const tmEnabled = useRepoStore((s) => s.timeMachine.enabled)
  const repo = useRepoStore((s) => s.repo)
  const { data } = useAnalytics()

  return (
    <header className="glass flex h-14 shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 px-4">
      {/* Repo identity */}
      <div className="flex items-center gap-1">
        <div className="grid size-7 place-items-center rounded-lg bg-forge-gradient text-white shadow-glow">
          <GitBranch className="size-3.5" />
        </div>
        <div className="leading-none">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            {repo}
            <RepoSwitcher />
            <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {data?.current_branch ?? '…'}
            </span>
          </div>
        </div>
      </div>

      {/* Search trigger (center) */}
      <button
        onClick={() => setSearchOpen(true)}
        className="glass mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="size-4" />
        <span>Search commits, authors, files…</span>
        <kbd className="ml-auto rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={tmEnabled ? 'gradient' : 'secondary'}
          size="sm"
          onClick={() => toggleTimeMachine()}
          className={cn('gap-2')}
        >
          <History className="size-4" />
          Time Machine
        </Button>
        <Button variant="ghost" size="sm" onClick={togglePalette} className="gap-2 text-muted-foreground">
          <Command className="size-3.5" />
          <kbd className="font-mono text-[10px]">⌘K</kbd>
        </Button>
      </div>
    </header>
  )
}
