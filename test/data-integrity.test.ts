import { describe, it, expect } from 'vitest'

import { validateData } from '../src/data-integrity'

describe('validateData — happy paths', () => {
  it('accepts well-formed lists', () => {
    const r = validateData(['a.com', 'b.com'], ['c.com'])
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.stats).toEqual({ indexCount: 2, wildcardCount: 1 })
  })

  it('accepts empty-adjacent lists only when non-empty', () => {
    expect(validateData([], ['c.com']).ok).toBe(false)
    expect(validateData(['a.com'], []).ok).toBe(false)
  })
})

describe('validateData — rejects malformed shape', () => {
  it('rejects non-array index', () => {
    const r = validateData('nope', ['c.com'])
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toMatch(/index: expected/)
  })

  it('rejects array with non-string entries', () => {
    const r = validateData(['a.com', 123, null], ['c.com'])
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toMatch(/index: expected/)
  })

  it('rejects non-array wildcard', () => {
    const r = validateData(['a.com'], { x: 1 })
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toMatch(/wildcard: expected/)
  })
})

describe('validateData — per-entry rules', () => {
  it('flags uppercase entries', () => {
    const r = validateData(['a.com', 'UPPER.com'], ['c.com'])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('not lowercase'))).toBe(true)
  })

  it('flags invalid hostnames', () => {
    const r = validateData(['a.com', 'not a host'], ['c.com'])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('not a valid hostname'))).toBe(true)
  })

  it('flags duplicates', () => {
    const r = validateData(['a.com', 'a.com'], ['c.com'])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('duplicate'))).toBe(true)
  })

  it('flags unsorted entries', () => {
    const r = validateData(['b.com', 'a.com'], ['c.com'])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('not sorted'))).toBe(true)
  })
})

describe('validateData — notInWildcard rule', () => {
  it('flags an exact entry covered by a wildcard suffix', () => {
    // sub.10mail.org is covered by wildcard 10mail.org
    const r = validateData(['sub.10mail.org', 'a.com'], ['10mail.org'])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('covered by wildcard'))).toBe(true)
  })

  it('does NOT flag a bare two-label exact that equals a wildcard entry', () => {
    // 10mail.org itself isn't "subdomained", so the rule doesn't apply.
    const r = validateData(['10mail.org', 'a.com'], ['10mail.org'])
    expect(r.ok).toBe(true)
  })

  it('does NOT flag a multi-label exact that equals a wildcard base', () => {
    // Bare bases like cad.edu.gr may live in both lists; only proper
    // subdomains are redundant.
    const r = validateData(['a.com', 'cad.edu.gr'], ['cad.edu.gr'])
    expect(r.ok).toBe(true)
  })
})
