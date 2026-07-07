import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'

/**
 * Commits-per-day area chart. The backend returns a sparse `{ISO date: count}`
 * map; we sort it chronologically and render a smooth gradient area.
 */
export function ActivityChart({ data }: { data: Record<string, number> }) {
  const series = useMemo(
    () =>
      Object.entries(data)
        .map(([date, count]) => ({ date, count, label: formatDay(date) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  )

  if (series.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-xs text-muted-foreground">
        No activity recorded.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--forge-violet))" stopOpacity={0.5} />
            <stop offset="100%" stopColor="hsl(var(--forge-violet))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ stroke: 'hsl(var(--forge-violet))', strokeWidth: 1 }}
          content={<ChartTooltip unit="commit" />}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--forge-violet))"
          strokeWidth={2}
          fill="url(#activityFill)"
          dot={{ r: 2.5, fill: 'hsl(var(--forge-violet))' }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function formatDay(iso: string): string {
  const [, m, d] = iso.split('-')
  const month = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
    Number(m)
  ]
  return `${month} ${Number(d)}`
}
