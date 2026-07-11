#!/usr/bin/env tsx
/**
 * Add new disposable domains from contributions/*.txt to data/*.json.
 *
 * Pipeline (mirrors upstream add.js, minus lodash):
 *   1. Read contributions/index.txt and contributions/wildcard.txt.
 *   2. Merge with existing data.
 *   3. Normalize: lowercase, trim, drop empty lines.
 *   4. Drop entries that don't look like valid hostnames.
 *   5. Sort + dedupe.
 *   6. Remove exact domains already covered by a wildcard suffix.
 *   7. Write both JSON files back with stable formatting.
 *   8. Run validateData() as a post-condition and exit non-zero on failure.
 *
 *   yarn add-domains
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { isValidHostname } from '../src/domain'
import { validateData } from '../src/data-integrity'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SUBDOMAIN_RE = /.+(\.[\w-]+\.[\w-]+)$/

function readLines(path: string): string[] {
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return []
  }
  return raw
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
}

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b))
}

/** Drop exact entries that are already covered by a wildcard suffix. */
function removeWildcardCovered(exact: string[], wildcards: string[]): string[] {
  const wset = new Set(wildcards)
  return exact.filter((d) => {
    if (!SUBDOMAIN_RE.test(d)) return true
    // walk parents and check the wildcard set
    const labels = d.split('.')
    for (let i = 1; i < labels.length; i++) {
      const parent = labels.slice(i).join('.')
      if (wset.has(parent)) return false
    }
    return true
  })
}

function main(): void {
  const index = resolve(root, 'data', 'index.json')
  const wildcard = resolve(root, 'data', 'wildcard.json')

  const existingIndex = JSON.parse(readFileSync(index, 'utf8')) as string[]
  const existingWildcard = JSON.parse(readFileSync(wildcard, 'utf8')) as string[]

  const newIndex = readLines(resolve(root, 'contributions', 'index.txt'))
  const newWildcard = readLines(resolve(root, 'contributions', 'wildcard.txt'))

  let indexMerged = uniqueSorted([...existingIndex, ...newIndex])
  let wildcardMerged = uniqueSorted([...existingWildcard, ...newWildcard])

  // Drop invalid hostnames from user contributions (don't silently corrupt the data)
  indexMerged = indexMerged.filter((d) => isValidHostname(d))
  wildcardMerged = wildcardMerged.filter((d) => isValidHostname(d))

  // Drop exacts covered by wildcards
  indexMerged = removeWildcardCovered(indexMerged, wildcardMerged)

  writeFileSync(index, `${JSON.stringify(indexMerged, null, 2)}\n`, 'utf8')
  writeFileSync(wildcard, `${JSON.stringify(wildcardMerged, null, 2)}\n`, 'utf8')

  const addedIndex = indexMerged.length - existingIndex.length
  const addedWildcard = wildcardMerged.length - existingWildcard.length

  const report = validateData(indexMerged, wildcardMerged)
  console.log(
    `index:    ${existingIndex.length} → ${indexMerged.length} (${addedIndex >= 0 ? '+' : ''}${addedIndex})\n` +
      `wildcard: ${existingWildcard.length} → ${wildcardMerged.length} (${addedWildcard >= 0 ? '+' : ''}${addedWildcard})`,
  )

  if (!report.ok) {
    console.error('\n✗ Post-write integrity check failed:')
    for (const e of report.errors.slice(0, 20)) console.error(`  - ${e}`)
    process.exit(1)
  }

  console.log('✓ Added. Clear contributions/*.txt before committing if desired.')
}

main()
