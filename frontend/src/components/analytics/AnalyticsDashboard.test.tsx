import { describe, it, expect, beforeAll } from 'vitest'
import { screen } from '@testing-library/react'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { renderWithQuery } from '@/test/renderWithQuery'
import { queryKeys } from '@/lib/hooks/queries'
import type { RepoOverviewDTO } from '@/lib/api/types'

// Recharts' ResponsiveContainer measures its parent; jsdom reports 0×0, so we
// stub the bounding box to a real size and let the charts render.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 640 })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 224 })
})

const overview: RepoOverviewDTO = {
  commit_count: 8,
  branch_count: 3,
  current_branch: 'main',
  object_count: 31,
  repository_size_bytes: 5119,
  contributor_count: 3,
  last_commit: null,
  commits_per_author: { 'Ada Lovelace': 4, 'Grace Hopper': 2, 'Linus Torvalds': 2 },
  activity_by_day: { '2025-01-06': 2, '2025-01-07': 3, '2025-01-08': 3 },
  most_changed_files: [
    { path: 'README.md', changes: 5 },
    { path: 'src/auth.py', changes: 3 },
  ],
  largest_commits: [],
  insights: [
    { kind: 'info', title: 'Largest commit', detail: 'A big one', commit_id: null },
  ],
}

describe('AnalyticsDashboard', () => {
  it('renders headline stats and lists from seeded data', () => {
    renderWithQuery(<AnalyticsDashboard />, (client) => {
      client.setQueryData(queryKeys.analytics('demo'), overview)
    })

    // Headline stat labels
    expect(screen.getByText('Commits')).toBeInTheDocument()
    expect(screen.getByText('Contributors')).toBeInTheDocument()

    // A most-changed file surfaces
    expect(screen.getByText('README.md')).toBeInTheDocument()

    // The insight card renders
    expect(screen.getByText('Largest commit')).toBeInTheDocument()
  })
})
