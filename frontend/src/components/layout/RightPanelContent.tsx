import { AnimatePresence, motion } from 'framer-motion'
import { CommitInspector } from '@/components/inspector/CommitInspector'
import { InsightsFeed } from '@/components/insights/InsightsFeed'
import { useRepoStore } from '@/store/useRepoStore'

/**
 * Decides what lives in the right rail: the commit inspector when something is
 * selected, otherwise the repository insights feed. Cross-fades between them.
 */
export function RightPanelContent() {
  const selectedId = useRepoStore((s) => s.selectedCommitId)
  const mode = selectedId ? 'inspector' : 'insights'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="h-full"
      >
        {mode === 'inspector' ? <CommitInspector /> : <InsightsFeed />}
      </motion.div>
    </AnimatePresence>
  )
}
