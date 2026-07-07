import { AppShell } from '@/components/layout/AppShell'
import { MainPanel } from '@/components/layout/MainPanel'
import { RightPanelContent } from '@/components/layout/RightPanelContent'

/**
 * Root view. The center stage and right rail are driven by store state
 * (`activePanel` and the selected commit); the shell only provides chrome.
 */
export default function App() {
  return <AppShell center={<MainPanel />} right={<RightPanelContent />} />
}
