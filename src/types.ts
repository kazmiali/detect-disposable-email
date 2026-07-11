/**
 * The result of checking whether an email or domain is disposable.
 */
export interface DisposableResult {
  /** true if the domain is in the disposable list (exact or wildcard match). */
  disposable: boolean
  /** The matched list entry that triggered the positive result, if any. */
  matched?: string
  /** How the match was made. Present only when `disposable` is true. */
  matchType?: 'exact' | 'wildcard'
}

/** Options accepted by {@link checkDisposable}. */
export interface CheckOptions {
  /**
   * When true, the input is treated as a bare domain and any leading
   * `local-part@` is NOT stripped. Default: false.
   */
  skipLocalPart?: boolean
}
