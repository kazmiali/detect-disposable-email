/**
 * Subpath entry (`detect-disposable-email/wildcard`): exports ONLY the wildcard data.
 *
 * Useful for consumers who want the small (~400-entry) wildcard list without
 * pulling the 120k-entry exact list into their bundle.
 */
export { disposableWildcardDomains } from './data'
