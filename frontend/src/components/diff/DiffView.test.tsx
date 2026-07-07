import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffView } from './DiffView'
import type { DiffFileDTO } from '@/lib/api/types'

const files: DiffFileDTO[] = [
  {
    path: 'src/auth.py',
    insertions: 2,
    deletions: 1,
    lines: [
      { op: 'equal', old_lineno: 1, new_lineno: 1, text: 'import os' },
      { op: 'remove', old_lineno: 2, new_lineno: null, text: 'old_token = None' },
      { op: 'add', old_lineno: null, new_lineno: 2, text: 'token = load_token()' },
      { op: 'add', old_lineno: null, new_lineno: 3, text: 'assert token' },
    ],
  },
]

describe('DiffView', () => {
  it('renders the file path and change counts', () => {
    const { container } = render(<DiffView files={files} />)
    expect(screen.getByText('src/auth.py')).toBeInTheDocument()
    // The header carries "+insertions" and "-deletions" as sibling spans.
    const header = container.querySelector('header')!
    expect(header.textContent).toContain('2') // insertions
    expect(header.textContent).toContain('1') // deletions
  })

  it('renders every diff line', () => {
    render(<DiffView files={files} />)
    expect(screen.getByText('token = load_token()')).toBeInTheDocument()
    expect(screen.getByText('old_token = None')).toBeInTheDocument()
  })

  it('shows an empty state when there are no files', () => {
    render(<DiffView files={[]} />)
    expect(screen.getByText(/No file changes/i)).toBeInTheDocument()
  })
})
