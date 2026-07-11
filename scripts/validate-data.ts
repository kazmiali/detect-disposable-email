#!/usr/bin/env tsx
/**
 * Standalone CLI: validates data/*.json integrity.
 *
 * Exits non-zero if any invariant is broken. Used by CI and as a dev convenience.
 *
 *   yarn validate-data
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { validateData } from '../src/data-integrity'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadJson(name: string): unknown {
  const p = resolve(root, 'data', name)
  return JSON.parse(readFileSync(p, 'utf8')) as unknown
}

function main(): void {
  const index = loadJson('index.json')
  const wildcard = loadJson('wildcard.json')
  const report = validateData(index, wildcard)

  console.log(
    `index:    ${report.stats.indexCount.toLocaleString()} entries\n` +
      `wildcard: ${report.stats.wildcardCount.toLocaleString()} entries`,
  )

  if (report.ok) {
    console.log('\n✓ All integrity checks passed.')
    process.exit(0)
  }

  console.error(`\n✗ ${report.errors.length} integrity error(s) found:`)
  const cap = 50
  for (const e of report.errors.slice(0, cap)) console.error(`  - ${e}`)
  if (report.errors.length > cap) {
    console.error(`  ... and ${report.errors.length - cap} more`)
  }
  process.exit(1)
}

main()
