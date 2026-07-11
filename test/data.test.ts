import { describe, it, expect } from 'vitest'

import { disposableDomains, disposableWildcardDomains } from '../src/data'
import { validateData } from '../src/data-integrity'

import { KNOWN_DISPOSABLE_EXACT, KNOWN_WILDCARD_BASES, KNOWN_CLEAN } from './fixtures'

describe('data integrity', () => {
  const report = validateData(disposableDomains, disposableWildcardDomains)

  it('passes all invariants', () => {
    expect(report.errors).toEqual([])
    expect(report.ok).toBe(true)
  })

  it('contains at least the upstream v1.0.62 counts', () => {
    // 121,569 originally; we punycode-converted 12 IDNs, leaving 121,557.
    // Use a loose lower bound to tolerate future additions/removals.
    expect(disposableDomains.length).toBeGreaterThanOrEqual(121_000)
    expect(disposableWildcardDomains.length).toBeGreaterThanOrEqual(390)
  })

  it('does not flag any known-clean provider as disposable', () => {
    const exact = new Set(disposableDomains)
    const violations = KNOWN_CLEAN.filter((d) => exact.has(d))
    expect(violations, `clean providers in dataset: ${violations.join(', ')}`).toEqual([])
  })

  it('still contains the sampled disposable fixtures', () => {
    const exact = new Set(disposableDomains)
    const wild = new Set(disposableWildcardDomains)
    const missingExact = KNOWN_DISPOSABLE_EXACT.filter((d) => !exact.has(d))
    const missingWild = KNOWN_WILDCARD_BASES.filter((d) => !wild.has(d))
    expect(missingExact).toEqual([])
    expect(missingWild).toEqual([])
  })
})
