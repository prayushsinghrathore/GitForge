interface TooltipPayloadEntry {
  value?: number | string
  name?: string
  payload?: Record<string, unknown>
}

/**
 * Shared glass tooltip for the Recharts charts. Recharts injects `active`,
 * `payload`, and `label` at render time; we type them loosely because the
 * library's own types are permissive here.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string | number
  unit?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0]
  const value = Number(entry.value ?? 0)
  const heading =
    (entry.payload?.author as string) ?? (entry.payload?.label as string) ?? String(label ?? '')

  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs shadow-glass">
      <p className="font-medium text-foreground">{heading}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-mono tabular-nums text-foreground">{value}</span>{' '}
        {unit}
        {value === 1 ? '' : 's'}
      </p>
    </div>
  )
}
