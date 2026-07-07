import { authorColor, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Circular initials chip tinted with the author's deterministic identity color. */
export function AuthorAvatar({
  name,
  className,
  size = 24,
}: {
  name: string
  className?: string
  size?: number
}) {
  const color = authorColor(name) // an hsl(...) string
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full text-[10px] font-semibold uppercase text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, black))`,
        boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
      }}
      title={name}
    >
      {initials(name)}
    </span>
  )
}
