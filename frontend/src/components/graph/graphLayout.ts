import type { Edge, Node } from '@xyflow/react'
import type { CommitGraphDTO } from '@/lib/api/types'
import type { CommitNodeData } from './CommitNode'

/** Pixel spacing for the (lane, row) grid the backend hands us. */
export const ROW_HEIGHT = 74
export const LANE_WIDTH = 40
export const GRAPH_PADDING = 32

interface LayoutArgs {
  graph: CommitGraphDTO
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

/**
 * Translate a {@link CommitGraphDTO} into React Flow nodes and edges.
 *
 * The backend already solved the hard part — every commit carries a `lane`
 * (column) and `row` — so this is a pure coordinate mapping plus decoration:
 * we dim non-neighbors of the hovered commit and mark the selected one.
 */
export function buildFlow({
  graph,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: LayoutArgs): { nodes: Node<CommitNodeData>[]; edges: Edge[] } {
  const neighbors = hoveredId ? neighborSet(graph, hoveredId) : null

  const nodes: Node<CommitNodeData>[] = graph.nodes.map((commit) => ({
    id: commit.id,
    type: 'commit',
    position: {
      x: GRAPH_PADDING + commit.lane * LANE_WIDTH,
      y: GRAPH_PADDING + commit.row * ROW_HEIGHT,
    },
    data: {
      commit,
      selected: commit.id === selectedId,
      dimmed: neighbors ? !neighbors.has(commit.id) : false,
      onSelect,
      onHover,
    },
    draggable: false,
    selectable: false,
  }))

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: `${edge.source}->${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'commit',
    data: { isMerge: edge.is_merge, lane: laneOf(graph, edge.source) },
    // React Flow draws source->target; our source is the child (newer, higher
    // row) and target the parent (older, lower row) — visually top-to-bottom.
  }))

  return { nodes, edges }
}

function laneOf(graph: CommitGraphDTO, id: string): number {
  return graph.nodes.find((n) => n.id === id)?.lane ?? 0
}

/** The hovered commit plus its direct parents and children — everything else dims. */
function neighborSet(graph: CommitGraphDTO, id: string): Set<string> {
  const set = new Set<string>([id])
  for (const e of graph.edges) {
    if (e.source === id) set.add(e.target)
    if (e.target === id) set.add(e.source)
  }
  return set
}

/** Total canvas height in px for the given graph (used to size the flow). */
export function graphHeight(graph: CommitGraphDTO): number {
  return GRAPH_PADDING * 2 + graph.nodes.length * ROW_HEIGHT
}
