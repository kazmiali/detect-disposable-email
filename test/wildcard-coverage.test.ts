import { describe, it, expect } from 'vitest'

import { isDisposable } from '../src/is-disposable'
import { disposableWildcardDomains } from '../src/data'

/**
 * Cross-cutting regression: for every wildcard base, a synthetic subdomain
 * must be flagged disposable, while the bare TLD segment must not be flagged
 * purely because it appears as a suffix.
 */
describe('wildcard coverage (full sweep)', () => {
  it('flags a synthetic subdomain of every wildcard base', () => {
    const misses: string[] = []
    for (const base of disposableWildcardDomains) {
      const sub = `zzz-test-subdomain.${base}`
      if (!isDisposable(sub)) misses.push(sub)
    }
    expect(misses, `${String(misses.length)} wildcard bases did not match`).toEqual([])
  })
})
