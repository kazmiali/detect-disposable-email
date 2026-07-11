import { describe, it, expect } from 'vitest'

import { isDisposable, isDisposableDomain, checkDisposable } from '../src/is-disposable'
import { warmup } from '../src/data'
import { disposableDomains } from '../src/data'

import {
  KNOWN_DISPOSABLE_EXACT,
  KNOWN_WILDCARD_BASES,
  KNOWN_CLEAN,
  SPECIFIC_DISPOSABLE,
} from './fixtures'

describe('isDisposable', () => {
  describe('exact matches', () => {
    it.each(SPECIFIC_DISPOSABLE)('returns true for %s', (d) => {
      expect(isDisposable(d)).toBe(true)
    })

    it('returns true for an email with an exact domain', () => {
      expect(isDisposable('foo@mailinator.com')).toBe(true)
    })

    it('returns true for a sampled subset of the dataset', () => {
      for (const d of KNOWN_DISPOSABLE_EXACT) {
        expect(isDisposable(d), `expected ${d} to be disposable`).toBe(true)
      }
    })
  })

  describe('case-insensitivity & whitespace', () => {
    it('ignores case in the domain', () => {
      expect(isDisposable('FOO@MAILINATOR.COM')).toBe(true)
      expect(isDisposable('Mailinator.COM')).toBe(true)
    })
    it('trims surrounding whitespace', () => {
      expect(isDisposable('  mailinator.com  ')).toBe(true)
      expect(isDisposable('\tfoo@mailinator.com\n')).toBe(true)
    })
  })

  describe('IDN / punycode', () => {
    it('matches a Unicode IDN that is stored as punycode in the dataset', () => {
      // Dataset has xn--gmal-nza.net (from upstream gmaıl.net)
      expect(isDisposable('xn--gmal-nza.net')).toBe(true)
      expect(isDisposable('gmaıl.net')).toBe(true)
      expect(isDisposable('user@gmaıl.net')).toBe(true)
    })
  })

  describe('wildcard / subdomain matches', () => {
    it('matches a multi-label wildcard base itself', () => {
      // cad.edu.gr is a 3-label wildcard base; bare domain must be disposable
      // (via exact if dual-listed, or via the wildcard-set self check).
      expect(isDisposable('cad.edu.gr')).toBe(true)
      const r = checkDisposable('cad.edu.gr')
      expect(r.disposable).toBe(true)
      expect(r.matched).toBe('cad.edu.gr')
      expect(r.matchType === 'exact' || r.matchType === 'wildcard').toBe(true)
    })

    it('matches a direct subdomain of a wildcard base', () => {
      const base = KNOWN_WILDCARD_BASES[0]!
      expect(isDisposable(`anything.${base}`)).toBe(true)
    })

    it('matches a deep subdomain of a wildcard base', () => {
      const base = KNOWN_WILDCARD_BASES[0]!
      expect(isDisposable(`a.b.c.${base}`)).toBe(true)
    })

    it('reports matchType=wildcard and the matched base via checkDisposable', () => {
      const base = KNOWN_WILDCARD_BASES[0]!
      const result = checkDisposable(`deep.sub.${base}`)
      expect(result).toEqual({
        disposable: true,
        matched: base,
        matchType: 'wildcard',
      })
    })

    it('does NOT match a sibling that shares only a suffix shorter than the base', () => {
      // If base = "10mail.org", "not10mail.org" should not match.
      const base = KNOWN_WILDCARD_BASES[0]!
      const fake = `not-${base}`
      // The fake might accidentally be in the exact list, so assert via check
      // only when it isn't.
      if (!disposableDomains.includes(fake)) {
        expect(isDisposable(fake)).toBe(false)
      }
    })
  })

  describe('non-disposable inputs', () => {
    it.each(KNOWN_CLEAN)('returns false for clean provider %s', (d) => {
      expect(isDisposable(d)).toBe(false)
      expect(isDisposable(`user@${d}`)).toBe(false)
    })

    it('returns false for a random made-up domain', () => {
      expect(isDisposable('no-such-provider-xyz.example')).toBe(false)
    })
  })

  describe('malformed inputs', () => {
    it.each([
      ['empty string', ''],
      ['only @', '@'],
      ['only local@', 'foo@'],
      ['not an email', 'not-an-email'],
      ['plain word', 'hello'],
      ['single label', 'localhost'],
      ['space inside', 'foo bar.com'],
    ])('returns false for %s', (_label, input) => {
      expect(isDisposable(input)).toBe(false)
    })

    it('returns false for non-string input (defensive)', () => {
      // The public type says string, but guard anyway.
      expect(isDisposable(undefined as unknown as string)).toBe(false)
      expect(isDisposable(null as unknown as string)).toBe(false)
      expect(isDisposable(123 as unknown as string)).toBe(false)
    })

    it('handles multiple @ by taking the last one as the domain separator', () => {
      expect(isDisposable('weird@local@mailinator.com')).toBe(true)
    })
  })

  describe('checkDisposable', () => {
    it('returns matchType=exact and the matched domain for exact hits', () => {
      expect(checkDisposable('mailinator.com')).toEqual({
        disposable: true,
        matched: 'mailinator.com',
        matchType: 'exact',
      })
    })
    it('returns a bare { disposable: false } for clean input (no extra keys)', () => {
      expect(checkDisposable('gmail.com')).toEqual({ disposable: false })
    })
  })

  describe('isDisposableDomain', () => {
    it('returns true for a disposable domain', () => {
      expect(isDisposableDomain('mailinator.com')).toBe(true)
    })
    it('does NOT strip a local-part when skipLocalPart is implied', () => {
      // 'foo@mailinator.com' is NOT a valid hostname, so it returns false.
      expect(isDisposableDomain('foo@mailinator.com')).toBe(false)
    })
  })
})

describe('lazy initialization', () => {
  it('exposes a warmup() that initializes Sets without throwing', () => {
    expect(() => {
      warmup()
    }).not.toThrow()
  })

  it('isDisposable works after warmup', () => {
    warmup()
    expect(isDisposable('mailinator.com')).toBe(true)
    expect(isDisposable('gmail.com')).toBe(false)
  })
})

describe('performance smoke', () => {
  it('handles 100k lookups in well under a second', () => {
    warmup()
    const inputs = [
      'mailinator.com',
      'a.b.10mail.org',
      'gmail.com',
      'not-disposable.example',
      'guerrillamail.com',
    ]
    const start = Date.now()
    const N = 100_000
    for (let i = 0; i < N; i++) {
      isDisposable(inputs[i % inputs.length]!)
    }
    const elapsed = Date.now() - start
    // Generous bound; typically < 100ms. Guards against accidental O(n) scans.
    expect(elapsed).toBeLessThan(2000)
  })
})
