import { useEffect } from 'react'
import { Command } from 'cmdk'
import {
  GitGraph,
  FileCode2,
  BarChart3,
  History,
  GitCommitHorizontal,
  Search,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useRepoStore, type PanelView } from '@/store/useRepoStore'
import { useGraph } from '@/lib/hooks/queries'
import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { relativeTime } from '@/lib/format'

const PANELS: { key: PanelView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'graph', label: 'Commit Graph', icon: GitGraph },
  { key: 'files', label: 'File Explorer', icon: FileCode2 },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
]

/**
 * ⌘K / "/" command palette. Fuzzy-navigates panels, jumps to any commit by
 * message/author/hash, and toggles the Time Machine — a single surface that
 * makes the whole app keyboard-drivable. Both the palette and the search
 * trigger open this; search just lands the caret in the same input.
 */
export function CommandPalette() {
  const open = useRepoStore((s) => s.paletteOpen)
  const searchOpen = useRepoStore((s) => s.searchOpen)
  const setPaletteOpen = useRepoStore((s) => s.setPaletteOpen)
  const setSearchOpen = useRepoStore((s) => s.setSearchOpen)
  const togglePalette = useRepoStore((s) => s.togglePalette)
  const setPanel = useRepoStore((s) => s.setPanel)
  const selectCommit = useRepoStore((s) => s.selectCommit)
  const toggleTimeMachine = useRepoStore((s) => s.toggleTimeMachine)
  const { data: graph } = useGraph()

  const isOpen = open || searchOpen

  const close = () => {
    setPaletteOpen(false)
    setSearchOpen(false)
  }

  // Global shortcuts: ⌘K / Ctrl-K toggles the palette; "/" opens search unless
  // the user is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        togglePalette()
        return
      }
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (e.key === '/' && !typing && !isOpen) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePalette, setSearchOpen, isOpen])

  const run = (fn: () => void) => {
    fn()
    close()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (o ? setPaletteOpen(true) : close())}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search commits and navigate GitForge
        </DialogDescription>
        <Command
          className="w-full"
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search commits, or jump to a view…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[360px] overflow-y-auto scroll-slim p-2">
            <Command.Empty className="py-8 text-center text-xs text-muted-foreground">
              No matches.
            </Command.Empty>

            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {PANELS.map((p) => {
                const Icon = p.icon
                return (
                  <Item key={p.key} value={`view ${p.label}`} onSelect={() => run(() => setPanel(p.key))}>
                    <Icon className="size-4 text-muted-foreground" />
                    <span>Go to {p.label}</span>
                  </Item>
                )
              })}
              <Item value="time machine replay" onSelect={() => run(() => toggleTimeMachine())}>
                <History className="size-4 text-muted-foreground" />
                <span>Toggle Time Machine</span>
              </Item>
            </Command.Group>

            {graph && graph.nodes.length > 0 && (
              <Command.Group
                heading="Commits"
                className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {graph.nodes.map((c) => (
                  <Item
                    key={c.id}
                    value={`${c.message} ${c.author} ${c.short} ${c.id}`}
                    onSelect={() =>
                      run(() => {
                        setPanel('graph')
                        selectCommit(c.id)
                      })
                    }
                  >
                    <AuthorAvatar name={c.author} size={20} />
                    <span className="min-w-0 flex-1 truncate">{c.message || '(no message)'}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {c.short}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground/70">
                      {relativeTime(c.timestamp)}
                    </span>
                  </Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center gap-3 border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
            <GitCommitHorizontal className="size-3" />
            <span>Enter to select</span>
            <span className="ml-auto">Esc to close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function Item({
  value,
  onSelect,
  children,
}: {
  value: string
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-foreground/90 data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
    >
      {children}
    </Command.Item>
  )
}
