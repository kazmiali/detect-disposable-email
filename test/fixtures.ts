/**
 * Curated regression fixtures shared across tests.
 *
 * `KNOWN_DISPOSABLE_EXACT` and `KNOWN_WILDCARD_BASES` are pulled from the
 * shipped data so that accidental data drops are caught at test time.
 * `KNOWN_CLEAN` is a hand-picked list of legitimate providers that must never
 * be flagged as disposable.
 */
import { disposableDomains, disposableWildcardDomains } from '../src/data'

/** Pick N deterministic entries from a sorted array (evenly spaced). */
function sample(arr: readonly string[], n: number): string[] {
  const out: string[] = []
  const step = Math.max(1, Math.floor(arr.length / n))
  for (let i = 0; i < arr.length && out.length < n; i += step) {
    out.push(arr[i]!)
  }
  return out
}

/** 50 exact-match domains sampled from the real dataset. */
export const KNOWN_DISPOSABLE_EXACT = sample(disposableDomains, 50)

/** A few specific exact domains asserted explicitly in is-disposable.test.ts. */
export const SPECIFIC_DISPOSABLE = [
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'throwawaymail.com',
] as const

/** 10 wildcard base domains sampled from the real dataset. */
export const KNOWN_WILDCARD_BASES = sample(disposableWildcardDomains, 10)

/**
 * Legitimate, well-known providers that must NEVER be flagged disposable.
 * If any of these ever appears in the dataset, that's a data bug.
 */
export const KNOWN_CLEAN = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'proton.me',
  'protonmail.com',
  'icloud.com',
  'aol.com',
  'zoho.com',
  'gmx.com',
  'yandex.com',
  'fastmail.com',
  'tutanota.com',
  'mail.com',
  'hey.com',
  'mit.edu',
  'harvard.edu',
  'ox.ac.uk',
  'example.com',
  'example.org',
] as const
