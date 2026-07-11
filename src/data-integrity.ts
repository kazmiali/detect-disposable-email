/**
 * Pure, dependency-free data-integrity validation for the disposable-domain lists.
 *
 * Used by:
 *   - the test suite (test/data.test.ts)
 *   - the standalone CLI script (scripts/validate-data.ts)
 *   - the add-domains script (after writing, as a post-condition check)
 *
 * This module is NOT part of the published runtime API (not re-exported from
 * src/index.ts). It lives under src/ so it gets type-checked and so both tests
 * and scripts can share a single implementation.
 */
import { isValidHostname } from './domain'

/** A list of human-readable problems found in the data. Empty === valid. */
export interface DataIntegrityReport {
  ok: boolean
  errors: string[]
  stats: {
    indexCount: number
    wildcardCount: number
  }
}

/** Domains with two or more dots — i.e. they MIGHT be covered by a wildcard suffix. */
const SUBDOMAINED_RE = /.+(\.[\w-]+\.[\w-]+)$/

/** True if `x` is an array of strings. */
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string')
}

/**
 * Push duplicate/out-of-order errors for a typed string array.
 *
 * Iterates adjacent pairs so there are no `undefined`-branch edge cases.
 */
function pushOrderIssues(arr: string[], label: string, errors: string[]): void {
  let prev: string | undefined
  arr.forEach((curr, i) => {
    if (i === 0) {
      prev = curr
      return
    }
    if (prev === curr) {
      errors.push(`${label}[${String(i)}]: duplicate of [${String(i - 1)}]: "${curr}"`)
    } else if (prev !== undefined && prev > curr) {
      errors.push(`${label}[${String(i)}]: not sorted: "${prev}" > "${curr}"`)
    }
    prev = curr
  })
}

/**
 * Validate the shape and invariants of the disposable-domain dataset.
 *
 * Checks:
 *  1. Both inputs are non-empty arrays of strings.
 *  2. Every entry is lowercase.
 *  3. Every entry is a plausible hostname.
 *  4. Each array is strictly ascending (sorted) and has no duplicates.
 *  5. No `index` entry is redundant with a `wildcard` suffix (upstream's `notInWildcard` rule).
 */
export function validateData(index: unknown, wildcard: unknown): DataIntegrityReport {
  const errors: string[] = []

  const indexOk = isStringArray(index)
  const wildcardOk = isStringArray(wildcard)
  if (!indexOk) errors.push('index: expected a non-empty array of strings')
  if (!wildcardOk) errors.push('wildcard: expected a non-empty array of strings')
  if (errors.length > 0) {
    return { ok: false, errors, stats: { indexCount: 0, wildcardCount: 0 } }
  }

  // Both are string[] here (guarded above), but TS narrowing on locals via
  // boolean aliases doesn't propagate, so cast once.
  const idx = index as string[]
  const wild = wildcard as string[]

  if (idx.length === 0) errors.push('index: empty')
  if (wild.length === 0) errors.push('wildcard: empty')

  // Per-entry checks
  idx.forEach((d, i) => {
    if (d !== d.toLowerCase()) {
      errors.push(`index[${String(i)}]: not lowercase: "${d}"`)
    } else if (!isValidHostname(d)) {
      errors.push(`index[${String(i)}]: not a valid hostname: "${d}"`)
    }
  })
  wild.forEach((d, i) => {
    if (d !== d.toLowerCase()) {
      errors.push(`wildcard[${String(i)}]: not lowercase: "${d}"`)
    } else if (!isValidHostname(d)) {
      errors.push(`wildcard[${String(i)}]: not a valid hostname: "${d}"`)
    }
  })

  // Sorted + deduped
  pushOrderIssues(idx, 'index', errors)
  pushOrderIssues(wild, 'wildcard', errors)

  // notInWildcard: an `index` entry that is a *proper subdomain* of a
  // wildcard base is redundant (e.g. `sub.10mail.org` when `10mail.org` is a
  // wildcard). The base itself may appear in both lists — exact covers bare
  // lookups (runtime also checks the wildcard set for the base), and the
  // wildcard covers subdomains.
  idx.forEach((d, i) => {
    if (!SUBDOMAINED_RE.test(d)) return
    const offender = wild.find((w) => d.endsWith(`.${w}`))
    if (offender) {
      errors.push(`index[${String(i)}]: "${d}" is covered by wildcard "${offender}"`)
    }
  })

  return {
    ok: errors.length === 0,
    errors,
    stats: { indexCount: idx.length, wildcardCount: wild.length },
  }
}
