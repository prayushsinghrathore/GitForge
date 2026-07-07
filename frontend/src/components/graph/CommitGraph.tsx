import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GitCommitHorizontal, AlertTriangle } from 'lucide-react'
import { CommitNode } from './CommitNode'
import { CommitEdge } from './CommitEdge'
import { buildFlow } from './graphLayout'
import { useGraph } from '@/lib/hooks/queries'
import { useRepoStore } from '@/store/useRepoStore'
import { Skeleton } from '@/components/ui/skeleton'
import { TimeMachineBar } from '@/components/timemachine/TimeMachineBar'
import type { CommitGraphDTO } from '@/lib/api/types'

const nodeTypes: NodeTypes = { commit: CommitNode }
const edgeTypes: EdgeTypes = { commit: CommitEdge }

/**
 * The centerpiece: an interactive commit DAG. Server data (positioned nodes +
 * edges) comes from {@link useGraph}; selection/hover live in the Zustand store
 * so the inspector and other panels react to the same cursor.
 */
export function CommitGraph() {
  const { data: graph, isLoading, isError } = useGraph()
  const selectedId = useRepoStore((s) => s.selectedCommitId)
  const hoveredId = useRepoStore((s) => s.hoveredCommitId)
  const selectCommit = useRepoStore((s) => s.selectCommit)
  const hoverCommit = useRepoStore((s) => s.hoverCommit)
  const tm = useRepoStore((s) => s.timeMachine)

  // When the Time Machine is on, hide commits newer than the cursor so history
  // replays. Filtering happens on the DTO before layout, so positions of the
  // surviving commits stay identical to the full graph.
  const visibleGraph = useMemo<CommitGraphDTO | undefined>(() => {
    if (!graph) return undefined
    if (!tm.enabled || !Number.isFinite(tm.cursor)) return graph
    const nodes = graph.nodes.filter((n) => n.timestamp <= tm.cursor)
    const visible = new Set(nodes.map((n) => n.id))
    return {
      ...graph,
      nodes,
      edges: graph.edges.filter((e) => visible.has(e.source) && visible.has(e.target)),
    }
  }, [graph, tm.enabled, tm.cursor])

  const { nodes, edges } = useMemo(() => {
    if (!visibleGraph) return { nodes: [], edges: [] }
    return buildFlow({
      graph: visibleGraph,
      selectedId,
      hoveredId,
      onSelect: selectCommit,
      onHover: hoverCommit,
    })
  }, [visibleGraph, selectedId, hoveredId, selectCommit, hoverCommit])

  if (isError) {
    return (
      <div className="grid h-full place-items-center bg-forge-radial p-8">
        <div className="glass flex max-w-md items-center gap-3 rounded-xl p-4 text-sm text-forge-amber">
          <AlertTriangle className="size-5 shrink-0" />
          <span>Couldn't load the commit graph. Is the engine running on :8000?</span>
        </div>
      </div>
    )
  }

  if (isLoading || !graph) {
    return (
      <div className="flex h-full flex-col gap-3 bg-forge-radial p-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-12 w-80 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-forge-radial p-8 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <GitCommitHorizontal className="size-8 opacity-50" />
          <p className="text-sm">No commits yet. This repository's history is empty.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-forge-radial" onClick={() => selectCommit(null)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onClick={(e) => e.stopPropagation()}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          className="opacity-40"
        />
        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4 rounded-lg border border-border/60 bg-card/80 backdrop-blur [&_button]:!border-border/40 [&_button]:!bg-transparent [&_button:hover]:!bg-accent [&_svg]:!fill-foreground"
        />
      </ReactFlow>
      <TimeMachineBar />
    </div>
  )
}
