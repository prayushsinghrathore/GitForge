import { describe, it, expect } from 'vitest'
import {
  shortHash,
  relativeTime,
  formatBytes,
  initials,
  laneColor,
  LANE_COLORS,
} from './format'

describe('shortHash', () => {
  it('takes the first 8 characters', () => {
    expect(shortHash('25f6c04e1234567890')).toBe('25f6c04e')
  })
  it('is safe for short ids', () => {
    expect(shortHash('abc')).toBe('abc')
  })
})

describe('relativeTime', () => {
  const now = 1_000_000_000_000 // fixed "now" in ms

  it('reports just now for sub-minute deltas', () => {
    expect(relativeTime(now / 1000 - 10, now)).toBe('just now')
  })
  it('singularizes one unit', () => {
    expect(relativeTime(now / 1000 - 60 * 60, now)).toBe('1 hour ago')
  })
  it('pluralizes multiple units', () => {
    expect(relativeTime(now / 1000 - 60 * 60 * 5, now)).toBe('5 hours ago')
  })
  it('rolls up to days', () => {
    expect(relativeTime(now / 1000 - 60 * 60 * 24 * 3, now)).toBe('3 days ago')
  })
})

describe('formatBytes', () => {
  it('keeps small values in bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })
  it('scales to KB/MB', () => {
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(1024 * 1024 * 3)).toBe('3 MB')
  })
  it('shows one decimal for non-integers', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
})

describe('initials', () => {
  it('builds initials from first and last name', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
  })
  it('handles a single name', () => {
    expect(initials('Linus')).toBe('LI')
  })
  it('is safe for empty input', () => {
    expect(initials('   ')).toBe('?')
  })
})

describe('laneColor', () => {
  it('wraps around the palette and handles negatives', () => {
    expect(laneColor(0)).toBe(`hsl(${LANE_COLORS[0]})`)
    expect(laneColor(LANE_COLORS.length)).toBe(`hsl(${LANE_COLORS[0]})`)
    expect(laneColor(-1)).toBe(`hsl(${LANE_COLORS[LANE_COLORS.length - 1]})`)
  })
  it('applies alpha when requested', () => {
    expect(laneColor(0, 0.5)).toBe(`hsl(${LANE_COLORS[0]} / 0.5)`)
  })
})
