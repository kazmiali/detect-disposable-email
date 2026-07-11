# detect-disposable-email

**Fast, typed disposable/temporary email domain detection — 160,000+ domains, zero runtime dependencies.**

[![npm version](https://img.shields.io/npm/v/detect-disposable-email.svg?style=flat-square)](https://www.npmjs.com/package/detect-disposable-email)
[![npm downloads](https://img.shields.io/npm/dm/detect-disposable-email.svg?style=flat-square)](https://www.npmjs.com/package/detect-disposable-email)
[![Build Status](https://img.shields.io/github/actions/workflow/status/kazmiali/detect-disposable-email/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/kazmiali/detect-disposable-email/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9%2B-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A modern, maintained successor to [`disposable-email-domains`](https://github.com/ivolo/disposable-email-domains).
It ships a **multi-source, regularly refreshable** dataset of disposable email
domains, plus a fast typed helper that correctly handles wildcard subdomains,
case, and whitespace — so you don't have to write the matching logic yourself.

---

## Highlights

- **166,956 exact-match domains** + **399 wildcard base domains**, merged from the best license-safe public lists (see [Data sources](#data-sources)).
- **Zero runtime dependencies.** No lodash, no `validator`. Pure TypeScript.
- **O(1) lookups** via lazily-initialized `Set`s; O(labels) wildcard matching by parent walk (no 400-element scan per call).
- **Typed helpers** — `isDisposable()`, `isDisposableDomain()`, `checkDisposable()`.
- **Dual ESM / CommonJS** with generated `.d.ts` types.
- **Lazy by default** — importing the package is cheap; the lookup structures build on first use. `warmup()` lets you pay the cost up front.
- **Data-integrity tested** — tests lock down shape, sorting, dedup, hostname validity, and the wildcard non-overlap invariant.
- **IDN-aware** — Unicode hostnames are punycode-normalized so they match the dataset.

---

## Install

```bash
# npm
npm install detect-disposable-email

# yarn
yarn add detect-disposable-email

# pnpm
pnpm add detect-disposable-email
```

Requirements: Node.js ≥ 20.

---

## Quick start

```ts
import { isDisposable } from 'detect-disposable-email'

isDisposable('foo@mailinator.com') // true  (exact match)
isDisposable('mailinator.com')     // true  (bare domain)
isDisposable('MAILINATOR.COM')     // true  (case-insensitive)
isDisposable('x.y.10mail.org')     // true  (wildcard subdomain match)
isDisposable('user@gmail.com')     // false (legit provider)
isDisposable('')                   // false (malformed input)
```

Want to know *which* rule matched?

```ts
import { checkDisposable } from 'detect-disposable-email'

checkDisposable('foo@mailinator.com')
// { disposable: true, matched: 'mailinator.com', matchType: 'exact' }

checkDisposable('x.y.10mail.org')
// { disposable: true, matched: '10mail.org', matchType: 'wildcard' }

checkDisposable('user@gmail.com')
// { disposable: false }
```

---

## API

### `isDisposable(input: string): boolean`

Returns `true` if `input` (an email **or** a bare domain) is disposable.

- Trims and lowercases the input.
- If the input contains `@`, the part after the last `@` is treated as the domain.
- Unicode IDNs are converted to punycode before lookup (matches the dataset).
- Invalid hostnames and empty input return `false`.

### `isDisposableDomain(domain: string): boolean`

Like `isDisposable`, but treats the input as a bare domain — a leading
`local-part@` is **not** stripped. Use this when you already have a domain.

### `checkDisposable(input: string, options?: CheckOptions): DisposableResult`

Returns a structured result describing the match:

```ts
interface DisposableResult {
  disposable: boolean
  matched?: string             // the list entry that matched
  matchType?: 'exact' | 'wildcard'
}

interface CheckOptions {
  /** Treat input as a bare domain; don't strip a `local@` prefix. */
  skipLocalPart?: boolean
}
```

### Raw data

```ts
import { disposableDomains, disposableWildcardDomains } from 'detect-disposable-email'

disposableDomains.length         // 166,956 — exact-match domains
disposableWildcardDomains.length // 399     — wildcard base domains
```

A subpath export is available if you want **only** the wildcard data without
pulling the full exact list into your bundle:

```ts
import { disposableWildcardDomains } from 'detect-disposable-email/wildcard'
```

### `warmup(): void`

Eagerly build the internal lookup `Set`s. Optional — call at startup if you
prefer to pay the one-time cost upfront instead of on the first lookup.

---

## How wildcard matching works

`wildcard.json` does **not** contain literal `*` characters. It contains **base
domains** such as `10mail.org`. Any subdomain of a base is considered disposable:

```
10mail.org        → wildcard base (also matched directly as exact)
foo.10mail.org    → disposable (parent walk hits 10mail.org)
a.b.10mail.org    → disposable (parent walk hits 10mail.org)
not10mail.org     → NOT disposable (different domain; not a parent)
```

Implementation: for `a.b.10mail.org` we walk parents (`b.10mail.org`,
`10mail.org`, `org`) and check each against a `Set` of wildcard bases. At most
~4–6 `Set.has()` calls per lookup — far faster than scanning all 399 wildcards.

---

## Performance

| Operation | Cost |
|-----------|------|
| `import 'detect-disposable-email'` | Cheap (Sets not yet built) |
| First `isDisposable()` call | ~10–15 ms one-time (Set construction) |
| Subsequent calls | O(1) exact + O(labels) wildcard ≈ sub-microsecond |
| 100,000 lookups | ~10–50 ms on modern hardware |

`Set.has()` is used for the ~167k-entry exact list. Wildcard matching walks the
domain's parent labels (typically ≤ 4) against a 399-entry `Set`.

---

## Bundling & package size

- **Tarball:** ~1.8 MB packed (grows with the domain list).
- The data is inlined into `dist/index.js` / `dist/index.cjs` at build time, so
  the package is self-contained (no runtime file reads).
- `sideEffects: false` is set for tree-shaking.
- Sourcemaps are intentionally **not** shipped (they re-encode the inlined JSON
  and would 3× the tarball with no debugging value).

---

## Migrating from `disposable-email-domains`

This package is a near drop-in replacement:

```diff
- const domains = require('disposable-email-domains')
+ const { disposableDomains: domains } = require('detect-disposable-email')
```

| Upstream | Here |
|----------|------|
| `require('disposable-email-domains')` | `disposableDomains` |
| `require('disposable-email-domains/wildcard.json')` | `disposableWildcardDomains` or `detect-disposable-email/wildcard` |
| (write your own matcher) | `isDisposable()` / `checkDisposable()` |

IDN entries are stored as punycode (e.g. `gmaıl.net` → `xn--gmal-nza.net`) so
they match real lookups. Unicode input is normalized at runtime via
`toAsciiHostname()`.

---

## Data sources

The exact-match list is a **union** of redistributable public datasets (CC0 /
MIT / BSD-3), plus the original ivolo baseline. GPL-licensed mega-lists are
intentionally excluded so this package can stay MIT.

| Source | License | Role |
|--------|---------|------|
| [disposable-email-domains/disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) | CC0 | Community-vetted accuracy |
| [disposable/disposable](https://github.com/disposable/disposable) (daily publish) | MIT | Daily bulk coverage |
| [tompec/disposable-email-domains](https://github.com/tompec/disposable-email-domains) | MIT | Maintained ivolo successor |
| [7c/fakefilter](https://github.com/7c/fakefilter) | BSD-3-Clause | Live provider monitoring |
| [wesbos/burner-email-providers](https://github.com/wesbos/burner-email-providers) | MIT | Community bulk |
| [castle/disposable-email-domains](https://github.com/castle/disposable-email-domains) | MIT | Top abuse-signal domains |
| [groundcat/disposable-email-domain-list](https://github.com/groundcat/disposable-email-domain-list) | MIT | MX-cleaned subset |

Refresh locally with:

```bash
yarn sync-sources          # fetch + merge + write data/
yarn sync-sources --dry-run
yarn validate-data
yarn test && yarn build
```

Known free/legitimate providers (Gmail, Outlook, Proton, etc.) are allowlisted
and never imported even if a source lists them.

---

## Scripts (for contributors)

| Command | Purpose |
|---------|---------|
| `yarn build` | Build `dist/` (ESM + CJS + types). |
| `yarn test` | Run the Vitest suite. |
| `yarn test:coverage` | Tests + V8 coverage with thresholds. |
| `yarn lint` / `yarn format` | ESLint (strict) / Prettier. |
| `yarn typecheck` | `tsc --noEmit`. |
| `yarn add-domains` | Merge `contributions/*.txt` into the dataset. |
| `yarn sync-sources` | Fetch & merge the best public disposable-domain lists. |
| `yarn validate-data` | Standalone data-integrity check. |

See [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) for the full contribution guide.

---

## Attribution

The disposable-domain dataset was originally compiled by **Ilya Volodarsky** in
[`ivolo/disposable-email-domains`](https://github.com/ivolo/disposable-email-domains)
(MIT) and is extended with the public sources listed above. All new code in this
repository is original and MIT-licensed.

---

## Author

**Muhammad Ali Kazmi** — [alikazmi.dev](https://alikazmi.dev)

[![Portfolio](https://img.shields.io/badge/Portfolio-alikazmi.dev-E63346?style=flat-square&logo=global&logoColor=white)](https://alikazmi.dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-alikazmidev-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/alikazmidev)
[![GitHub](https://img.shields.io/badge/GitHub-kazmiali-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/kazmiali)

## License

MIT © [Muhammad Ali Kazmi](https://alikazmi.dev)

---

**[Report a missing domain](https://github.com/kazmiali/detect-disposable-email/issues/new?labels=domains&template=domain_report.md)** ·
**[Report a false positive](https://github.com/kazmiali/detect-disposable-email/issues/new?labels=domains&template=domain_report.md)** ·
**[Star on GitHub](https://github.com/kazmiali/detect-disposable-email)**
