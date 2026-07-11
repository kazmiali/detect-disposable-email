# Changelog

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
during the version step.

Releases are published from the `main` branch by the
[`Release` GitHub Actions workflow](.github/workflows/release.yml).
