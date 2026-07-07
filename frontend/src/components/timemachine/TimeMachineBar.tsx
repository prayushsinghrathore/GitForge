import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as Slider from '@radix-ui/react-slider'
import { Play, Pause, X, History, Rewind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRepoStore } from '@/store/useRepoStore'
import { useGraph } from '@/lib/hooks/queries'
import { formatDateTime } from '@/lib/format'

const SPEEDS = [0.5, 1, 2, 4]

/**
 * Repository Time Machine — replays history. When enabled it exposes a scrubber
 * bound to `timeMachine.cursor` (unix seconds); the graph hides commits newer
 * than the cursor. Playback steps the cursor commit-by-commit so history
 * "grows" on screen.
 */
export function TimeMachineBar() {
  const { data: graph } = useGraph()
  const tm = useRepoStore((s) => s.timeMachine)
  const toggle = useRepoStore((s) => s.toggleTimeMachine)
  const setCursor = useRepoStore((s) => s.setTimeCursor)
  const setPlaying = useRepoStore((s) => s.setTimePlaying)
  const setSpeed = useRepoStore((s) => s.setTimeSpeed)

  // Sorted commit timestamps (oldest → newest) define the scrubber stops.
  const stops = useMemo(() => {
    if (!graph) return []
    return [...new Set(graph.nodes.map((n) => n.timestamp))].sort((a, b) => a - b)
  }, [graph])

  const min = stops[0] ?? 0
  const max = stops[stops.length - 1] ?? 0

  // On enable, snap the cursor into range if it's still at ±Infinity.
  useEffect(() => {
    if (tm.enabled && !Number.isFinite(tm.cursor)) setCursor(min)
  }, [tm.enabled, tm.cursor, min, setCursor])

  // Playback: advance to the next stop on an interval scaled by speed.
  useEffect(() => {
    if (!tm.enabled || !tm.playing || stops.length === 0) return
    const id = setInterval(() => {
      const current = useRepoStore.getState().timeMachine.cursor
      const next = stops.find((s) => s > current)
      if (next === undefined) {
        setPlaying(false)
      } else {
        setCursor(next)
      }
    }, 1100 / tm.speed)
    return () => clearInterval(id)
  }, [tm.enabled, tm.playing, tm.speed, stops, setCursor, setPlaying])

  if (!tm.enabled) return null

  const visibleCount = graph ? graph.nodes.filter((n) => n.timestamp <= tm.cursor).length : 0
  const atEnd = tm.cursor >= max

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      className="glass-strong pointer-events-auto absolute bottom-6 left-1/2 z-20 w-[min(680px,92%)] -translate-x-1/2 rounded-2xl p-3 shadow-glass"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCursor(min)}
            className="text-muted-foreground"
            aria-label="Rewind to start"
          >
            <Rewind className="size-4" />
          </Button>
          <Button
            variant="gradient"
            size="icon-sm"
            onClick={() => {
              if (atEnd) setCursor(min)
              setPlaying(!tm.playing)
            }}
            aria-label={tm.playing ? 'Pause' : 'Play'}
          >
            {tm.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Slider.Root
            className="relative flex h-5 w-full touch-none select-none items-center"
            min={min}
            max={max}
            step={1}
            value={[Math.min(Math.max(tm.cursor, min), max)]}
            onValueChange={([v]) => {
              setPlaying(false)
              setCursor(v)
            }}
          >
            <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
              <Slider.Range className="absolute h-full rounded-full bg-forge-gradient" />
            </Slider.Track>
            <Slider.Thumb
              className="block size-4 rounded-full bg-white shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="History cursor"
            />
          </Slider.Root>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <History className="size-3" />
              {Number.isFinite(tm.cursor) ? formatDateTime(tm.cursor) : '—'}
            </span>
            <span className="tabular-nums">
              {visibleCount}/{graph?.nodes.length ?? 0} commits
            </span>
          </div>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary/60 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-1.5 py-1 text-[10px] font-medium tabular-nums transition-colors ${
                tm.speed === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggle()}
          className="text-muted-foreground"
          aria-label="Exit Time Machine"
        >
          <X className="size-4" />
        </Button>
      </div>
    </motion.div>
  )
}
