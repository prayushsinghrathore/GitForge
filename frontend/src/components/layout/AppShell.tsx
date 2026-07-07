import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'
import { BottomBar } from './BottomBar'

/**
 * The application chrome: sidebar · (top-bar / center / bottom-bar) · right panel.
 * Center and right content are passed in so feature phases can slot their views
 * without touching the shell.
 */
export function AppShell({
  center,
  right,
  activity,
}: {
  center: React.ReactNode
  right?: React.ReactNode
  activity?: string[]
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="relative min-h-0 flex-1 overflow-hidden">{center}</main>
        <BottomBar lines={activity} />
      </div>
      <RightPanel>{right}</RightPanel>
    </div>
  )
}
