import { Sparkles } from 'lucide-react'

/**
 * Compact rendering of a single free-text commit insight (the engine returns
 * these as plain strings on the commit inspector payload).
 */
export function InsightPill({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs text-foreground/90">
      <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  )
}
