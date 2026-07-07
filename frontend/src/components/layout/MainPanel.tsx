import { AnimatePresence, motion } from 'framer-motion'
import { CommitGraph } from '@/components/graph/CommitGraph'
import { FileExplorer } from '@/components/files/FileExplorer'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { useRepoStore } from '@/store/useRepoStore'

/**
 * Center-stage router. `activePanel` in the store selects which feature view
 * mounts — the commit graph, the file explorer, or the analytics dashboard.
 */
export function MainPanel() {
  const panel = useRepoStore((s) => s.activePanel)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={panel}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="h-full w-full"
      >
        {panel === 'graph' && <CommitGraph />}
        {panel === 'files' && <FileExplorer />}
        {panel === 'analytics' && <AnalyticsDashboard />}
      </motion.div>
    </AnimatePresence>
  )
}
