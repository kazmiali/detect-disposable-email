# Changelog

## 1.1.0

### Minor Changes

- **Data refresh:** exact domains **121,557 → 166,956** (+45,399), merged from the
  best license-safe public lists (community CC0 list, disposable/disposable daily,
  tompec, fakefilter, wesbos, castle top-1k, groundcat MX-cleaned). Wildcards stay
  at 399.
- **`yarn sync-sources`:** new script to re-fetch and merge those sources (with
  allowlist for legitimate providers, punycode normalize, integrity checks).
- **Wildcard base matching:** bare multi-label wildcard bases (e.g. `cad.edu.gr`)
  now match via the wildcard set, not only their subdomains.
- Restored **`ubicloud.com`** (was missing vs old upstream).

## 1.0.0

### Major Changes

- 66d1df5: Initial release: typed, zero-dependency disposable email domain detection.

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

This project uses [Changesets](https://github.com/changesets/changesets) to
manage releases. The contents below are generated from `.changeset/*.md` files
during the version step (`yarn changeset:version`).

Packages are published to npm manually (`yarn changeset:publish` or
`yarn npm publish --access public`).
