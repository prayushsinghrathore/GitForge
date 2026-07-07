import { describe, it, expect, vi } from 'vitest'
import { buildFlow, GRAPH_PADDING, LANE_WIDTH, ROW_HEIGHT } from './graphLayout'
import type { CommitGraphDTO } from '@/lib/api/types'

function node(id: string, lane: number, row: number, extra: Partial<CommitGraphDTO['nodes'][0]> = {}) {
  return {
    id,
    short: id.slice(0, 8),
    author: 'Ada Lovelace',
    message: `commit ${id}`,
    timestamp: 1700000000 + row,
    is_merge: false,
    is_head: false,
    branch: null,
    lane,
    row,
    files_changed: 1,
    insertions: 2,
    deletions: 0,
    insights: [],
    ...extra,
  }
}

const graph: CommitGraphDTO = {
  head: 'c',
  lane_count: 2,
  nodes: [
    node('c', 0, 0, { is_head: true, branch: 'main' }),
    node('b', 1, 1, { is_merge: true }),
    node('a', 0, 2),
  ],
  edges: [
    { source: 'c', target: 'b', is_merge: false },
    { source: 'c', target: 'a', is_merge: false },
    { source: 'b', target: 'a', is_merge: true },
  ],
}

describe('buildFlow', () => {
  const noop = vi.fn()

  it('maps (lane,row) to pixel coordinates', () => {
    const { nodes } = buildFlow({
      graph,
      selectedId: null,
      hoveredId: null,
      onSelect: noop,
      onHover: noop,
    })
    const c = nodes.find((n) => n.id === 'c')!
    expect(c.position).toEqual({ x: GRAPH_PADDING, y: GRAPH_PADDING })
    const b = nodes.find((n) => n.id === 'b')!
    expect(b.position).toEqual({
      x: GRAPH_PADDING + LANE_WIDTH,
      y: GRAPH_PADDING + ROW_HEIGHT,
    })
  })

  it('produces one edge per DTO edge with stable ids', () => {
    const { edges } = buildFlow({
      graph,
      selectedId: null,
      hoveredId: null,
      onSelect: noop,
      onHover: noop,
    })
    expect(edges).toHaveLength(3)
    expect(edges.map((e) => e.id)).toContain('c->a')
  })

  it('marks the selected commit', () => {
    const { nodes } = buildFlow({
      graph,
      selectedId: 'b',
      hoveredId: null,
      onSelect: noop,
      onHover: noop,
    })
    expect(nodes.find((n) => n.id === 'b')!.data.selected).toBe(true)
    expect(nodes.find((n) => n.id === 'a')!.data.selected).toBe(false)
  })

  it('dims non-neighbors of the hovered commit', () => {
    const { nodes } = buildFlow({
      graph,
      selectedId: null,
      hoveredId: 'c', // neighbors: c, b, a (both parents)
      onSelect: noop,
      onHover: noop,
    })
    // c and its parents stay lit; nothing else exists to dim here, so add a lone node.
    expect(nodes.find((n) => n.id === 'c')!.data.dimmed).toBe(false)
    expect(nodes.find((n) => n.id === 'b')!.data.dimmed).toBe(false)
  })

  it('dims a commit unrelated to the hovered one', () => {
    const wide: CommitGraphDTO = {
      ...graph,
      nodes: [...graph.nodes, node('z', 1, 3)],
      // 'z' has no edge to 'c'
    }
    const { nodes } = buildFlow({
      graph: wide,
      selectedId: null,
      hoveredId: 'c',
      onSelect: noop,
      onHover: noop,
    })
    expect(nodes.find((n) => n.id === 'z')!.data.dimmed).toBe(true)
  })
})
