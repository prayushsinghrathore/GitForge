import { AppShell } from '@/components/layout/AppShell'
import { MainPanel } from '@/components/layout/MainPanel'
import { RightPanelContent } from '@/components/layout/RightPanelContent'
import { CommandPalette } from '@/components/command/CommandPalette'
import { ImportRepoDialog } from '@/components/home/ImportRepoDialog'
import { useRepoStore } from '@/store/useRepoStore'

/**
 * Root view. The center stage and right rail are driven by store state
 * (`activePanel` and the selected commit); the shell only provides chrome. The
 * command palette mounts once at the root and listens for ⌘K / "/".
 */
export default function App() {
  const activity = useRepoStore((s) => s.activity)
  return (
    <>
      <AppShell
        center={<MainPanel />}
        right={<RightPanelContent />}
        activity={activity}
      />
      <CommandPalette />
      <ImportRepoDialog />
    </>
  )
}
