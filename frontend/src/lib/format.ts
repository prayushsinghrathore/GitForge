/**
 * Presentation formatters — pure, dependency-free, and unit-tested.
 * Kept separate from components so the logic can be verified in isolation.
 */

/** The six GitForge swim-lane colors, indexed by `lane % 6`. */
export const LANE_COLORS = [
  'var(--forge-violet)',
  'var(--forge-cyan)',
  'var(--forge-emerald)',
  'var(--forge-amber)',
  'var(--forge-fuchsia)',
  'var(--forge-rose)',
] as const

/** Resolve a lane index to its `hsl(...)` color string. */
export function laneColor(lane: number, alpha = 1): string {
  const token = LANE_COLORS[((lane % LANE_COLORS.length) + LANE_COLORS.length) % LANE_COLORS.length]
  return alpha === 1 ? `hsl(${token})` : `hsl(${token} / ${alpha})`
}

/** First 8 characters of a commit id — the conventional short hash. */
export function shortHash(id: string): string {
  return id.slice(0, 8)
}

/** Human-friendly relative time from a unix-seconds timestamp. */
export function relativeTime(unixSeconds: number, now: number = Date.now()): string {
  const deltaSec = Math.round(now / 1000 - unixSeconds)
  if (deltaSec < 45) return 'just now'
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.348, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ]
  let value = deltaSec
  let unit = 'second'
  for (const [size, name] of units) {
    if (value < size) {
      unit = name
      break
    }
    value = value / size
    unit = name
  }
  const rounded = Math.floor(value)
  return `${rounded} ${unit}${rounded === 1 ? '' : 's'} ago`
}

/** Absolute, locale-aware date-time from unix seconds. */
export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Compact date (e.g. "Jan 6") from unix seconds. */
export function formatShortDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** Format a byte count into a human-readable size (1 KB = 1024 B). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 10 || Number.isInteger(value) ? 0 : 1)} ${units[i]}`
}

/** Author initials for avatar chips (e.g. "Ada Lovelace" → "AL"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Deterministic accent color for an author, derived from the name hash.
 * Stable across renders so each contributor keeps one identity color.
 */
export function authorColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return laneColor(hash)
}
