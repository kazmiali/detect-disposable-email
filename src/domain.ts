/**
 * Small, dependency-free helpers for working with email domains.
 *
 * These intentionally avoid the `validator` package and RFC 5322 grammars —
 * the goal is just to recognize plausible hostnames well enough to look them
 * up in our disposable lists.
 */

/**
 * Matches a plausible lowercase ASCII hostname.
 *
 * - Total length 1–253 characters.
 * - Each label: 1–63 chars, alphanumeric with internal hyphens, no leading/trailing hyphen.
 * - At least one dot.
 *
 * Call {@link toAsciiHostname} first so Unicode IDNs become punycode before
 * this check (the dataset stores punycode only).
 */
const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/

/** True if the string contains any non-ASCII character (code point > 127). */
function hasNonAscii(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 127) return true
  }
  return false
}

/** Trim and lowercase an input string. */
export function normalize(input: string): string {
  return input.trim().toLowerCase()
}

/**
 * Extract the domain from an email-ish input.
 *
 * If the input contains `@`, returns the part after the LAST `@`. Otherwise
 * returns the input unchanged. We deliberately do not perform RFC-accurate
 * parsing — taking the last `@` correctly handles `local@part@domain` and
 * quoted local-parts are vanishingly rare for disposable-domain lookups.
 */
export function extractDomain(input: string): string {
  const at = input.lastIndexOf('@')
  return at === -1 ? input : input.slice(at + 1)
}

/**
 * Convert a hostname to ASCII/punycode when it contains Unicode labels.
 *
 * Pure-ASCII inputs are returned unchanged (fast path). Unicode IDNs are
 * converted via the WHATWG URL parser so they match the punycode entries in
 * the dataset (e.g. `gmaıl.net` → `xn--gmal-nza.net`).
 */
export function toAsciiHostname(domain: string): string {
  if (!hasNonAscii(domain)) {
    return domain
  }
  try {
    const host = new URL(`http://${domain}`).hostname
    return host === '' ? domain : host
  } catch {
    return domain
  }
}

/** True if `domain` looks like a valid lowercase ASCII hostname. */
export function isValidHostname(domain: string): boolean {
  return HOSTNAME_RE.test(domain)
}

/**
 * Yields parent domains of `domain`, from most-specific parent to the TLD,
 * EXCLUDING the domain itself (callers check the exact form via a Set first).
 *
 * Example: `parentsOf('a.b.c.com')` yields `'b.c.com'`, `'c.com'`, `'com'`.
 *
 * Used for wildcard matching: `a.b.10mail.org` → we check whether any parent
 * (`b.10mail.org`, `10mail.org`, `org`) is in the wildcard set.
 */
export function* parentsOf(domain: string): Generator<string> {
  const labels = domain.split('.')
  for (let i = 1; i < labels.length; i++) {
    yield labels.slice(i).join('.')
  }
}
