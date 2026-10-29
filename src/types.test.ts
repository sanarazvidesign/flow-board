import { describe, expect, it } from 'vitest'
import { normalizeTag } from './types'

describe('normalizeTag', () => {
  it('trims, lowercases and hyphenates whitespace', () => {
    expect(normalizeTag('  Needs   Review ')).toBe('needs-review')
  })

  it('REGRESSION: limits tag length to 30 characters', () => {
    expect(normalizeTag('x'.repeat(100))).toHaveLength(30)
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeTag('   ')).toBe('')
  })
})
