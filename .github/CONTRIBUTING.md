# Contributing to detect-disposable-email

Thanks for your interest in improving the disposable-domain dataset and library!

## Adding new domains

The easiest way to contribute new disposable domains:

1. Add one domain per line to [`contributions/index.txt`](../contributions/index.txt)
   (or wildcard base domains to [`contributions/wildcard.txt`](../contributions/wildcard.txt)).
2. Run the merge + normalize script:

   ```bash
   yarn add-domains
   ```

   This lowercases, sorts, dedupes, drops invalid hostnames, and removes any
   exact entry already covered by a wildcard suffix.

3. Run the test suite to confirm nothing broke:

   ```bash
   yarn test
   ```

4. Commit `data/index.json` / `data/wildcard.json` along with your staging files,
   and open a pull request.

### What counts as a "disposable" domain?

A domain whose mailboxes are intended to be temporary, anonymous, or throwaway.
Examples: `mailinator.com`, `10minutemail.com`, `guerrillamail.com`, and any
subdomain of services like `10mail.org` (a wildcard base).

**Please do not add legitimate providers** (Gmail, Outlook, Proton, universities,
companies). The test suite has a regression list of known-clean providers that
must never appear in the dataset.

### Wildcard vs exact

- **Exact** (`data/index.json`): a specific domain that is disposable, e.g.
  `mailinator.com`. A lookup for exactly that domain returns true.
- **Wildcard** (`data/wildcard.json`): a base domain where **any subdomain** is
  disposable, e.g. `10mail.org` matches `foo.10mail.org`, `a.b.10mail.org`, etc.

If a service issues disposable addresses on arbitrary subdomains, add the base
to `wildcard.json` rather than enumerating every subdomain.

## Development setup

```bash
git clone https://github.com/kazmiali/detect-disposable-email.git
cd detect-disposable-email
yarn install
```

Requirements: Node.js ≥ 18, Yarn 4 (Corepack will provide it).

## Useful scripts

| Script | Purpose |
|--------|---------|
| `yarn build` | Build `dist/` (ESM + CJS + types) via tsup. |
| `yarn test` | Run the Vitest suite. |
| `yarn test:coverage` | Run tests with V8 coverage + thresholds. |
| `yarn lint` | ESLint (strict, type-aware). |
| `yarn format` | Prettier auto-fix. |
| `yarn typecheck` | `tsc --noEmit`. |
| `yarn add-domains` | Merge `contributions/*.txt` into the dataset. |
| `yarn validate-data` | Standalone integrity check of the JSON files. |

## Before opening a PR

- [ ] `yarn lint` passes
- [ ] `yarn typecheck` passes
- [ ] `yarn format:check` passes
- [ ] `yarn test` passes
- [ ] If you added/changed domains, `yarn validate-data` passes
- [ ] You added a changeset (see below)

## Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) for
versioning and the changelog. To record a change:

```bash
yarn changeset
```

Pick `minor` for new domains/features, `patch` for fixes. Merging to `main`
triggers the Release workflow, which opens a "Version Packages" PR that bumps
the version, updates `CHANGELOG.md`, and publishes to npm on merge.

## License

By contributing you agree your contributions are licensed under the project's
[MIT license](../LICENSE).
