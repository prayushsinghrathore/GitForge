import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, ChevronUp, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHealth } from '@/lib/hooks/queries'

/**
 * Bottom activity bar — a faux "terminal / activity" strip. Collapsed by
 * default; expands to a live activity log. Also surfaces backend health.
 */
export function BottomBar({ lines = [] }: { lines?: string[] }) {
  const [open, setOpen] = useState(false)
  const { data: health, isError } = useHealth()
  const online = Boolean(health) && !isError

  return (
    <div className="glass shrink-0 rounded-none border-x-0 border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 px-4 text-xs text-muted-foreground hover:text-foreground"
      >
        <Terminal className="size-3.5" />
        <span className="font-medium">Activity</span>
        <span className="mx-1 h-3 w-px bg-border" />
        <Circle
          className={cn(
            'size-2 fill-current',
            online ? 'text-forge-emerald' : 'text-forge-amber',
          )}
        />
        <span>{online ? 'engine online' : 'connecting…'}</span>
        <ChevronUp
          className={cn('ml-auto size-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 160, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="h-full overflow-y-auto scroll-slim p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <div className="text-forge-emerald">$ gitforge status</div>
              {lines.length === 0 ? (
                <div className="opacity-60">// activity will stream here as you explore the graph</div>
              ) : (
                lines.map((l, i) => <div key={i}>{l}</div>)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
