import { describe, it, expect } from 'vitest'

import {
  extractDomain,
  isValidHostname,
  normalize,
  parentsOf,
  toAsciiHostname,
} from '../src/domain'

describe('normalize', () => {
  it('trims and lowercases', () => {
    expect(normalize('  Hello.World  ')).toBe('hello.world')
  })
  it('returns empty string for whitespace-only input', () => {
    expect(normalize('   ')).toBe('')
  })
})

describe('extractDomain', () => {
  it('returns the part after the last @', () => {
    expect(extractDomain('foo@bar.com')).toBe('bar.com')
  })
  it('handles multiple @ by taking the last', () => {
    expect(extractDomain('a@b@bar.com')).toBe('bar.com')
  })
  it('returns input unchanged when there is no @', () => {
    expect(extractDomain('bar.com')).toBe('bar.com')
  })
  it('returns empty string for a trailing @', () => {
    expect(extractDomain('foo@')).toBe('')
  })
})

describe('toAsciiHostname', () => {
  it('returns pure-ASCII domains unchanged', () => {
    expect(toAsciiHostname('mailinator.com')).toBe('mailinator.com')
    expect(toAsciiHostname('xn--gmal-nza.net')).toBe('xn--gmal-nza.net')
    expect(toAsciiHostname('not a host')).toBe('not a host')
  })

  it('converts Unicode IDNs to punycode', () => {
    // gmaıl.net (dotless i) is in the dataset as xn--gmal-nza.net
    expect(toAsciiHostname('gmaıl.net')).toBe('xn--gmal-nza.net')
  })

  it('returns the original string when URL conversion fails', () => {
    // Lone surrogate is non-ASCII but not a valid hostname for URL()
    const broken = `bad\uD800host.com`
    expect(toAsciiHostname(broken)).toBe(broken)
  })
})

describe('isValidHostname', () => {
  it.each([
    'example.com',
    'sub.example.com',
    'a.b.c.d.example.com',
    'xn--gmal-nza.net', // punycode
    'my-host.co.uk',
    '123.example.org',
  ])('accepts %s', (d) => {
    expect(isValidHostname(d)).toBe(true)
  })

  it.each([
    '',
    'no-dot',
    '.starts-with-dot.com',
    'ends-with-dot.com.',
    '-leading-hyphen.com',
    'trailing-hyphen-.com',
    'UPPER.com',
    'space in.com',
    'unicode→é.com',
    'a'.repeat(64) + '.com', // label too long
  ])('rejects %s', (d) => {
    expect(isValidHostname(d)).toBe(false)
  })
})

describe('parentsOf', () => {
  it('yields parents from most-specific to TLD, excluding the domain itself', () => {
    expect(Array.from(parentsOf('a.b.c.com'))).toEqual(['b.c.com', 'c.com', 'com'])
  })
  it('yields nothing for a single-label input', () => {
    expect(Array.from(parentsOf('localhost'))).toEqual([])
  })
  it('yields just the TLD for a two-label domain', () => {
    expect(Array.from(parentsOf('example.com'))).toEqual(['com'])
  })
})
