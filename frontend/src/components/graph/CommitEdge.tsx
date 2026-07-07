import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import { laneColor } from '@/lib/format'

/**
 * Curved connector between a commit and its parent, tinted by the child's lane
 * color. Merge edges (second-parent links) are dashed so branch joins read at a
 * glance.
 */
export function CommitEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.35,
  })

  const lane = (data?.lane as number) ?? 0
  const isMerge = Boolean(data?.isMerge)
  const color = laneColor(lane)

  return (
    <BaseEdge
      path={path}
      style={{
        stroke: color,
        strokeWidth: 2,
        strokeDasharray: isMerge ? '5 4' : undefined,
        opacity: isMerge ? 0.65 : 0.9,
      }}
    />
  )
}
