import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { authorColor } from '@/lib/format'

/**
 * Horizontal bar chart of commits per contributor, each bar tinted with that
 * author's deterministic identity color (shared with their avatar chips).
 */
export function ContributorsChart({ data }: { data: Record<string, number> }) {
  const series = useMemo(
    () =>
      Object.entries(data)
        .map(([author, count]) => ({ author, count, fill: authorColor(author) }))
        .sort((a, b) => b.count - a.count),
    [data],
  )

  if (series.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-xs text-muted-foreground">
        No contributors yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart
        data={series}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
        barCategoryGap={8}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="author"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={96}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
          content={<ChartTooltip unit="commit" />}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {series.map((s) => (
            <Cell key={s.author} fill={s.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
