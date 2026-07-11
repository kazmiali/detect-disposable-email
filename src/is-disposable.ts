import type { CheckOptions, DisposableResult } from './types'
import { extractDomain, isValidHostname, normalize, parentsOf, toAsciiHostname } from './domain'
import { getExactSet, getWildcardSet } from './data'

/**
 * Check whether `input` (an email OR a bare domain) is disposable, returning
 * a structured result describing the match.
 *
 * @example
 *   checkDisposable('foo@mailinator.com') // { disposable: true, matched: 'mailinator.com', matchType: 'exact' }
 *   checkDisposable('a.b.10mail.org')     // { disposable: true, matched: '10mail.org', matchType: 'wildcard' }
 *   checkDisposable('gmail.com')          // { disposable: false }
 */
export function checkDisposable(input: string, options?: CheckOptions): DisposableResult {
  if (typeof input !== 'string') {
    return { disposable: false }
  }

  const normalized = normalize(input)
  if (normalized === '') {
    return { disposable: false }
  }

  const rawDomain = options?.skipLocalPart ? normalized : extractDomain(normalized)
  if (rawDomain === '') {
    return { disposable: false }
  }

  const domain = toAsciiHostname(rawDomain)
  if (!isValidHostname(domain)) {
    return { disposable: false }
  }

  const exact = getExactSet()
  if (exact.has(domain)) {
    return { disposable: true, matched: domain, matchType: 'exact' }
  }

  const wildcards = getWildcardSet()
  for (const parent of parentsOf(domain)) {
    if (wildcards.has(parent)) {
      return { disposable: true, matched: parent, matchType: 'wildcard' }
    }
  }

  return { disposable: false }
}

/**
 * Fast boolean check: is `input` (an email OR a bare domain) disposable?
 *
 * Use {@link checkDisposable} if you need to know WHICH rule matched.
 */
export function isDisposable(input: string): boolean {
  return checkDisposable(input).disposable
}

/**
 * Like {@link isDisposable}, but treats the input as a bare domain (does not
 * strip a `local-part@` prefix). Convenience for callers that already have a
 * domain in hand.
 */
export function isDisposableDomain(domain: string): boolean {
  return checkDisposable(domain, { skipLocalPart: true }).disposable
}
