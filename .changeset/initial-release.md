---
'detect-disposable-email': major
---

Initial release: typed, zero-dependency disposable email domain detection.

- 121,557 exact-match domains + 399 wildcard base domains (sourced from
  `disposable-email-domains` v1.0.62, MIT, with 12 IDN entries normalized to
  punycode).
- `isDisposable()`, `isDisposableDomain()`, and `checkDisposable()` helpers with
  case-insensitive, whitespace-tolerant, wildcard-aware matching (including IDN
  → punycode conversion for Unicode hostnames).
- Lazy-initialized `Set` lookups (O(1) exact, O(labels) wildcard) for high
  throughput; `warmup()` for eager initialization.
- Dual ESM/CJS builds with full TypeScript types.
- Data-integrity test suite covering shape, sorting, dedup, hostname validity,
  and the notInWildcard invariant.
