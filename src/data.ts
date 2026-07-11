/**
 * The disposable-domain dataset, plus lazy-initialized lookup structures.
 *
 * The data itself is imported at module load (tree-shaken into the bundle by tsup),
 * but the {@link Set}s used for O(1) lookups are built lazily on first use of
 * {@link isDisposable}, so merely importing the package does not pay the Set cost.
 */
import exactDomains from '../data/index.json'
import wildcardDomains from '../data/wildcard.json'

/** The exact-match disposable domains (copied verbatim from upstream v1.0.62). */
export const disposableDomains: readonly string[] = exactDomains

/** The wildcard base domains; any subdomain of these is disposable. */
export const disposableWildcardDomains: readonly string[] = wildcardDomains

let exactSet: Set<string> | null = null
let wildcardSet: Set<string> | null = null

/** Lazy `Set` of exact domains for O(1) `has()` lookups. Built once, memoized. */
export function getExactSet(): Set<string> {
  exactSet ??= new Set(exactDomains)
  return exactSet
}

/** Lazy `Set` of wildcard base domains for O(labels) parent-walk lookups. */
export function getWildcardSet(): Set<string> {
  wildcardSet ??= new Set(wildcardDomains)
  return wildcardSet
}

/**
 * Eagerly initialize both lookup Sets.
 *
 * Optional: call this at application startup if you want to pay the one-time
 * cost (~120k entries) up front instead of on the first lookup.
 */
export function warmup(): void {
  getExactSet()
  getWildcardSet()
}
