#!/usr/bin/env tsx
/**
 * Merge the best actively-maintained, redistributable disposable-domain lists
 * into data/index.json (and leave data/wildcard.json intact except for the
 * notInWildcard cleanup).
 *
 * Sources (license-safe for an MIT package — GPL lists intentionally excluded):
 *   1. Existing data/index.json (baseline)
 *   2. disposable-email-domains/disposable-email-domains  (CC0)  — accuracy / community
 *   3. disposable/disposable daily domains.txt           (MIT)  — daily bulk
 *   4. tompec/disposable-email-domains index.json        (MIT)  — ivolo successor
 *   5. 7c/fakefilter txt/data.txt                        (BSD-3)— live provider monitor
 *   6. wesbos/burner-email-providers emails.txt          (MIT)  — community bulk
 *   7. castle/disposable-email-domains top-1k            (MIT)  — real abuse signal
 *   8. groundcat/disposable-email-domain-list            (MIT)  — MX-cleaned
 *
 * Pipeline:
 *   fetch → normalize (lower/trim/punycode) → drop invalid / allowlisted
 *   → sort+dedupe → strip exacts covered by wildcards → write → validate
 *
 *   yarn sync-sources
 *   yarn sync-sources --dry-run
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { domainToASCII } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { isValidHostname } from '../src/domain'
import { validateData } from '../src/data-integrity'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SUBDOMAIN_RE = /.+(\.[\w-]+\.[\w-]+)$/
const dryRun = process.argv.includes('--dry-run')

/**
 * Never-block legitimate / free providers (false-positive shield).
 * If a source lists any of these, we drop them.
 */
const ALLOWLIST = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.jp',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.it',
  'yahoo.es',
  'yahoo.ca',
  'yahoo.com.au',
  'yahoo.com.br',
  'ymail.com',
  'rocketmail.com',
  'outlook.com',
  'outlook.co.uk',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.it',
  'hotmail.es',
  'live.com',
  'live.co.uk',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'aim.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'fastmail.com',
  'fastmail.fm',
  'tutanota.com',
  'tuta.io',
  'tutamail.com',
  'mail.com',
  'email.com',
  'hey.com',
  'mailbox.org',
  'posteo.de',
  'posteo.net',
  'runbox.com',
  'hushmail.com',
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'bellsouth.net',
  'cox.net',
  'charter.net',
  'earthlink.net',
  'btinternet.com',
  'bt.com',
  'sky.com',
  'virginmedia.com',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'laposte.net',
  'web.de',
  't-online.de',
  'libero.it',
  'virgilio.it',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'rediffmail.com',
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'localhost.localdomain',
])

interface Source {
  name: string
  url: string
  /** 'lines' = one domain per line; 'json-array' = JSON string[] */
  format: 'lines' | 'json-array'
  license: string
}

const SOURCES: Source[] = [
  {
    name: 'disposable-email-domains (CC0, accuracy)',
    url: 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf',
    format: 'lines',
    license: 'CC0',
  },
  {
    name: 'disposable/disposable daily (MIT)',
    url: 'https://disposable.github.io/disposable-email-domains/domains.txt',
    format: 'lines',
    license: 'MIT',
  },
  {
    name: 'tompec ivolo-successor (MIT)',
    url: 'https://raw.githubusercontent.com/tompec/disposable-email-domains/main/index.json',
    format: 'json-array',
    license: 'MIT',
  },
  {
    name: '7c/fakefilter (BSD-3)',
    url: 'https://raw.githubusercontent.com/7c/fakefilter/main/txt/data.txt',
    format: 'lines',
    license: 'BSD-3-Clause',
  },
  {
    name: 'wesbos/burner-email-providers (MIT)',
    url: 'https://raw.githubusercontent.com/wesbos/burner-email-providers/master/emails.txt',
    format: 'lines',
    license: 'MIT',
  },
  {
    name: 'castle top-1000 abuse (MIT)',
    url: 'https://raw.githubusercontent.com/castle/disposable-email-domains/master/disposable-email-domains.txt',
    format: 'lines',
    license: 'MIT',
  },
  {
    name: 'groundcat MX-cleaned (MIT)',
    url: 'https://raw.githubusercontent.com/groundcat/disposable-email-domain-list/master/domains.txt',
    format: 'lines',
    license: 'MIT',
  },
]

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b))
}

/** Normalize a raw domain token into punycode ASCII hostname, or null if unusable. */
function normalizeDomain(raw: string): string | null {
  let d = raw.trim().toLowerCase()
  if (d.length === 0 || d.startsWith('#') || d.startsWith('//')) return null
  // strip accidental scheme / path / trailing dots
  d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.+$/, '')
  if (d.includes('@')) d = d.slice(d.lastIndexOf('@') + 1)
  if (d.includes(' ')) return null
  if (d.length === 0) return null

  // Unicode → punycode
  if (/[^a-z0-9.-]/.test(d)) {
    const ascii = domainToASCII(d)
    if (!ascii || ascii === '') return null
    d = ascii.toLowerCase()
  }

  if (!isValidHostname(d)) return null
  if (ALLOWLIST.has(d)) return null
  return d
}

function parseBody(body: string, format: Source['format']): string[] {
  if (format === 'json-array') {
    const parsed = JSON.parse(body) as unknown
    if (!Array.isArray(parsed)) {
      throw new Error('expected JSON array')
    }
    return parsed.map(String)
  }
  return body.split(/\r?\n/)
}

async function fetchSource(source: Source): Promise<{ ok: number; dropped: number; domains: string[] }> {
  const res = await fetch(source.url, {
    headers: { 'user-agent': 'detect-disposable-email-sync/1.0 (+https://github.com/kazmiali/detect-disposable-email)' },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${String(res.status)} for ${source.url}`)
  }
  const body = await res.text()
  const raw = parseBody(body, source.format)
  const domains: string[] = []
  let dropped = 0
  for (const token of raw) {
    const n = normalizeDomain(token)
    if (n === null) {
      if (token.trim().length > 0 && !token.trim().startsWith('#')) dropped++
      continue
    }
    domains.push(n)
  }
  return { ok: domains.length, dropped, domains }
}

function removeWildcardCovered(exact: string[], wildcards: string[]): string[] {
  const wset = new Set(wildcards)
  return exact.filter((d) => {
    if (!SUBDOMAIN_RE.test(d)) return true
    const labels = d.split('.')
    for (let i = 1; i < labels.length; i++) {
      const parent = labels.slice(i).join('.')
      if (wset.has(parent)) return false
    }
    return true
  })
}

async function main(): Promise<void> {
  const indexPath = resolve(root, 'data', 'index.json')
  const wildcardPath = resolve(root, 'data', 'wildcard.json')

  const existingIndex = JSON.parse(readFileSync(indexPath, 'utf8')) as string[]
  const existingWildcard = JSON.parse(readFileSync(wildcardPath, 'utf8')) as string[]

  console.log(`Baseline index:    ${existingIndex.length.toLocaleString()}`)
  console.log(`Baseline wildcard: ${existingWildcard.length.toLocaleString()}`)
  console.log(dryRun ? '\n(dry-run — will not write files)\n' : '')

  const merged = new Set<string>(existingIndex)
  const perSource: { name: string; fetched: number; newToUs: number; dropped: number }[] = []

  for (const source of SOURCES) {
    process.stdout.write(`Fetching ${source.name} … `)
    try {
      const { ok, dropped, domains } = await fetchSource(source)
      let newToUs = 0
      for (const d of domains) {
        if (!merged.has(d)) {
          merged.add(d)
          newToUs++
        }
      }
      perSource.push({ name: source.name, fetched: ok, newToUs, dropped })
      console.log(`ok (${ok.toLocaleString()} usable, +${newToUs.toLocaleString()} new, ${dropped} dropped)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`FAILED: ${msg}`)
      perSource.push({ name: source.name, fetched: 0, newToUs: 0, dropped: 0 })
    }
  }

  // Re-normalize existing entries too (defensive), then drop allowlisted
  let indexMerged = uniqueSorted(
    Array.from(merged)
      .map((d) => normalizeDomain(d))
      .filter((d): d is string => d !== null),
  )
  let wildcardMerged = uniqueSorted(
    existingWildcard
      .map((d) => normalizeDomain(d))
      .filter((d): d is string => d !== null),
  )

  const beforeWildcardStrip = indexMerged.length
  indexMerged = removeWildcardCovered(indexMerged, wildcardMerged)
  const strippedByWildcard = beforeWildcardStrip - indexMerged.length

  // Guard: known-clean must not appear
  const cleanHits = indexMerged.filter((d) => ALLOWLIST.has(d))
  if (cleanHits.length > 0) {
    console.error(`\n✗ Allowlist domains slipped into merge: ${cleanHits.join(', ')}`)
    process.exit(1)
  }

  console.log('\n── per-source summary ──')
  for (const s of perSource) {
    console.log(
      `  ${s.name}\n    usable=${s.fetched.toLocaleString()}  new=${s.newToUs.toLocaleString()}  dropped=${s.dropped}`,
    )
  }

  console.log('\n── result ──')
  console.log(
    `index:    ${existingIndex.length.toLocaleString()} → ${indexMerged.length.toLocaleString()} ` +
      `(${indexMerged.length - existingIndex.length >= 0 ? '+' : ''}${(indexMerged.length - existingIndex.length).toLocaleString()})`,
  )
  console.log(
    `wildcard: ${existingWildcard.length.toLocaleString()} → ${wildcardMerged.length.toLocaleString()} ` +
      `(stripped ${strippedByWildcard.toLocaleString()} exacts covered by wildcards)`,
  )

  const report = validateData(indexMerged, wildcardMerged)
  if (!report.ok) {
    console.error(`\n✗ Integrity check failed (${report.errors.length} errors):`)
    for (const e of report.errors.slice(0, 30)) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log('✓ Integrity checks passed.')

  if (dryRun) {
    console.log('\nDry-run complete — no files written.')
    return
  }

  writeFileSync(indexPath, `${JSON.stringify(indexMerged, null, 2)}\n`, 'utf8')
  writeFileSync(wildcardPath, `${JSON.stringify(wildcardMerged, null, 2)}\n`, 'utf8')
  console.log('\n✓ Wrote data/index.json and data/wildcard.json')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
