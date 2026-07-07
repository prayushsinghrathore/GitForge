import { cn } from '@/lib/utils'

/** GitForge logo mark: three commit nodes on a forked path, gradient-filled. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-7 w-7', className)} aria-hidden="true">
      <defs>
        <linearGradient id="forge-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(256 90% 66%)" />
          <stop offset="100%" stopColor="hsl(189 94% 55%)" />
        </linearGradient>
      </defs>
      <path
        d="M9 24V13a5 5 0 0 1 5-5h4"
        fill="none"
        stroke="url(#forge-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="9" cy="24" r="4" fill="url(#forge-mark)" />
      <circle cx="9" cy="8" r="4" fill="url(#forge-mark)" />
      <circle cx="23" cy="8" r="4" fill="url(#forge-mark)" />
      <path
        d="M9 12v-0.5"
        fill="none"
        stroke="url(#forge-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid place-items-center rounded-xl bg-primary/10 p-1.5 shadow-glow">
        <BrandMark />
      </div>
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight">
            Git<span className="text-gradient">Forge</span>
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Version Control
          </div>
        </div>
      )}
    </div>
  )
}
