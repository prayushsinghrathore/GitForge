/**
 * Right rail — Developer Insights / Commit Inspector. Provides the framed glass
 * column; the content (insights feed or inspector) manages its own scroll and
 * header, so this shell stays a thin container.
 */
export function RightPanel({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="glass flex w-[360px] shrink-0 flex-col overflow-hidden rounded-none border-y-0 border-r-0">
      {children}
    </aside>
  )
}
