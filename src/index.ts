/**
 * detect-disposable-email — public API.
 *
 * @packageDocumentation
 */

// Data
export { disposableDomains, disposableWildcardDomains, warmup } from './data'

// Helpers
export { isDisposable, isDisposableDomain, checkDisposable } from './is-disposable'

// Types
export type { DisposableResult, CheckOptions } from './types'
