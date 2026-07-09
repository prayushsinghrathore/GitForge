/**
 * Global UI/interaction state (Zustand).
 *
 * This store holds ONLY ephemeral view state — what's selected, hovered,
 * searched, which panel is active, and the Time Machine cursor. All server data
 * lives in React Query. Keeping the two concerns separate is what lets the Time
 * Machine treat history as immutable and derive everything from a cursor.
 */
import { create } from 'zustand'

export type PanelView = 'graph' | 'analytics' | 'files'

export interface TimeMachineState {
  enabled: boolean
  /** Cursor as a unix-seconds timestamp; commits at/after this are hidden. */
  cursor: number
  playing: boolean
  /** Replay speed multiplier. */
  speed: number
}

export interface RepoState {
  repo: string

  // selection / hover
  selectedCommitId: string | null
  hoveredCommitId: string | null
  inspectorOpen: boolean

  // navigation
  activePanel: PanelView
  activeBranch: string | null

  // search
  searchQuery: string
  searchOpen: boolean

  // command palette
  paletteOpen: boolean

  // import dialog
  importDialogOpen: boolean

  // activity log (mutation feedback surfaced in the bottom bar)
  activity: string[]

  // time machine
  timeMachine: TimeMachineState

  // actions
  selectCommit: (id: string | null) => void
  hoverCommit: (id: string | null) => void
  setInspectorOpen: (open: boolean) => void
  setPanel: (panel: PanelView) => void
  setActiveBranch: (branch: string | null) => void
  setSearch: (query: string) => void
  setSearchOpen: (open: boolean) => void
  setPaletteOpen: (open: boolean) => void
  togglePalette: () => void
  setRepo: (name: string) => void
  setImportDialogOpen: (open: boolean) => void
  pushActivity: (line: string) => void
  toggleTimeMachine: (bounds?: { min: number; max: number }) => void
  setTimeCursor: (cursor: number) => void
  setTimePlaying: (playing: boolean) => void
  setTimeSpeed: (speed: number) => void
}

export const useRepoStore = create<RepoState>((set) => ({
  repo: 'demo',

  selectedCommitId: null,
  hoveredCommitId: null,
  inspectorOpen: false,

  activePanel: 'graph',
  activeBranch: null,

  searchQuery: '',
  searchOpen: false,

  paletteOpen: false,

  importDialogOpen: false,

  activity: [],

  timeMachine: { enabled: false, cursor: Number.POSITIVE_INFINITY, playing: false, speed: 1 },

  selectCommit: (id) => set({ selectedCommitId: id, inspectorOpen: id !== null }),
  hoverCommit: (id) => set({ hoveredCommitId: id }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setPanel: (panel) => set({ activePanel: panel }),
  setActiveBranch: (branch) => set({ activeBranch: branch }),
  setSearch: (query) => set({ searchQuery: query }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  setRepo: (name) => set({ repo: name, selectedCommitId: null, inspectorOpen: false }),
  setImportDialogOpen: (open) => set({ importDialogOpen: open }),
  pushActivity: (line) => set((s) => ({ activity: [...s.activity, line].slice(-100) })),

  toggleTimeMachine: (bounds) =>
    set((s) => {
      const enabling = !s.timeMachine.enabled
      return {
        timeMachine: {
          ...s.timeMachine,
          enabled: enabling,
          playing: false,
          cursor: enabling
            ? (bounds?.min ?? s.timeMachine.cursor)
            : Number.POSITIVE_INFINITY,
        },
      }
    }),
  setTimeCursor: (cursor) => set((s) => ({ timeMachine: { ...s.timeMachine, cursor } })),
  setTimePlaying: (playing) => set((s) => ({ timeMachine: { ...s.timeMachine, playing } })),
  setTimeSpeed: (speed) => set((s) => ({ timeMachine: { ...s.timeMachine, speed } })),
}))
