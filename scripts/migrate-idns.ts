#!/usr/bin/env tsx
/**
 * One-shot migration: convert any unicode (IDN) domains in data/index.json and
 * data/wildcard.json to their canonical punycode ASCII form.
 *
 * Why: email domains on the wire are ASCII (punycode). A unicode entry like
 * `gmaıl.net` (Turkish dotless i) will never match a real lookup. Storing the
 * punycode form (`xn--gmal-nza.net`) preserves the intent and makes the entry
 * actually matchable.
 *
 * This script is idempotent and is intended to be run once. It's kept in-tree
 * for documentation and in case upstream data is ever re-imported.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { domainToASCII } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { isValidHostname } from '../src/domain'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const NON_ASCII = /[^a-z0-9.-]/

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b))
}

function migrateFile(name: string): void {
  const path = resolve(root, 'data', name)
  const input = JSON.parse(readFileSync(path, 'utf8')) as string[]
  let converted = 0
  let dropped = 0

  const out: string[] = []
  for (const d of input) {
    const lower = d.toLowerCase()
    if (!NON_ASCII.test(lower)) {
      out.push(lower)
      continue
    }
    const p = domainToASCII(lower)
    if (p && !NON_ASCII.test(p) && isValidHostname(p)) {
      out.push(p)
      converted++
    } else {
      dropped++
    }
  }

  const sorted = uniqueSorted(out)
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  console.log(
    `${name}: ${input.length} → ${sorted.length} (${converted} punycoded, ${dropped} dropped)`,
  )
}

migrateFile('index.json')
migrateFile('wildcard.json')
