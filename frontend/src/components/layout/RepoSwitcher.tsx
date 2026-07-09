import { useState } from 'react'
import { Check, Search, GitBranch, Plus, Loader2 } from 'lucide-react'
import { GithubIcon } from '@/lib/github-icon'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useListRepos } from '@/lib/hooks/queries'
import { useRepoStore } from '@/store/useRepoStore'
import { cn } from '@/lib/utils'

/**
 * Repository switcher popover.
 *
 * Lists all available repositories, highlights the active one, and provides
 * a search filter plus a button to import a new repository.
 */
export function RepoSwitcher() {
  const repo = useRepoStore((s) => s.repo)
  const setRepo = useRepoStore((s) => s.setRepo)
  const setImportDialogOpen = useRepoStore((s) => s.setImportDialogOpen)
  const pushActivity = useRepoStore((s) => s.pushActivity)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { data, isLoading } = useListRepos()

  const repos = data?.repositories ?? []

  const filtered = query.trim()
    ? repos.filter((r) => r.toLowerCase().includes(query.toLowerCase()))
    : repos

  const handleSwitch = (name: string) => {
    if (name === repo) {
      setOpen(false)
      return
    }
    setRepo(name)
    pushActivity(`✓ switched to ${name}`)
    setOpen(false)
  }

  const handleImport = () => {
    setOpen(false)
    setImportDialogOpen(true)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Switch repository"
        >
          <GitBranch className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-72 p-0">
        {/* Header */}
        <div className="px-3 pb-1 pt-3">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter repositories…"
              className="h-7 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-56 min-h-0 overflow-y-auto scroll-slim px-1 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {query ? 'No matching repositories.' : 'No repositories yet.'}
            </p>
          ) : (
            filtered.map((name) => {
              const active = name === repo
              return (
                <button
                  key={name}
                  onClick={() => handleSwitch(name)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors',
                    active
                      ? 'bg-accent/80 text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-primary/10">
                    <GitBranch className="size-3 text-primary" />
                  </span>
                  <span className="truncate font-mono">{name}</span>
                  {active && (
                    <Check className="ml-auto size-3.5 shrink-0 text-primary" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer — import */}
        <div className="border-t border-border/50 px-2 py-2">
          <button
            onClick={handleImport}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <span className="grid size-5 shrink-0 place-items-center rounded bg-secondary">
              <Plus className="size-3" />
            </span>
            <span>Import Repository</span>
            <GithubIcon className="ml-auto size-3.5 text-muted-foreground/60" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
