import { motion } from 'framer-motion'
import { GitGraph, GitBranch, BarChart3, Search, Settings, History } from 'lucide-react'
import { Brand } from './Brand'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useRepoStore, type PanelView } from '@/store/useRepoStore'
import { useBranches } from '@/lib/hooks/queries'
import { laneColor } from '@/lib/format'

interface NavItem {
  key: PanelView | 'search' | 'timemachine' | 'settings'
  label: string
  icon: React.ComponentType<{ className?: string }>
  hint: string
}

const NAV: NavItem[] = [
  { key: 'graph', label: 'Repository', icon: GitGraph, hint: 'Commit graph' },
  { key: 'files', label: 'Files', icon: GitBranch, hint: 'File explorer' },
  { key: 'analytics', label: 'Insights', icon: BarChart3, hint: 'Analytics' },
]

export function Sidebar() {
  const activePanel = useRepoStore((s) => s.activePanel)
  const setPanel = useRepoStore((s) => s.setPanel)
  const setSearchOpen = useRepoStore((s) => s.setSearchOpen)
  const togglePalette = useRepoStore((s) => s.togglePalette)
  const toggleTimeMachine = useRepoStore((s) => s.toggleTimeMachine)
  const tmEnabled = useRepoStore((s) => s.timeMachine.enabled)
  const { data: branches } = useBranches()

  return (
    <aside className="glass flex w-[248px] shrink-0 flex-col gap-1 rounded-none border-y-0 border-l-0 p-3">
      <div className="px-2 py-3">
        <Brand />
      </div>

      <nav className="mt-2 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = activePanel === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => setPanel(item.key as PanelView)}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-lg bg-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="my-3 h-px bg-border/50" />

      {/* Branch list */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim px-1">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Branches
          </span>
          <span className="text-[10px] text-muted-foreground/70">{branches?.length ?? 0}</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {branches?.map((b, i) => (
            <li key={b.name}>
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: laneColor(i) }}
                />
                <span className="truncate font-mono">{b.name}</span>
                {b.is_current && (
                  <span className="ml-auto rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                    HEAD
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer actions */}
      <div className="mt-2 flex items-center gap-1 border-t border-border/50 pt-3">
        <SidebarAction hint="Search (/)" onClick={() => setSearchOpen(true)}>
          <Search className="size-4" />
        </SidebarAction>
        <SidebarAction
          hint="Time Machine (T)"
          active={tmEnabled}
          onClick={() => toggleTimeMachine()}
        >
          <History className="size-4" />
        </SidebarAction>
        <SidebarAction hint="Command Palette (⌘K)" onClick={togglePalette}>
          <Settings className="size-4" />
        </SidebarAction>
      </div>
    </aside>
  )
}

function SidebarAction({
  hint,
  active,
  onClick,
  children,
}: {
  hint: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon-sm"
          onClick={onClick}
          className="text-muted-foreground data-[active=true]:text-primary-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{hint}</TooltipContent>
    </Tooltip>
  )
}
