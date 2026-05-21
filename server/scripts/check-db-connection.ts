/**
 * Verify DIRECT_URL / DATABASE_URL against Supabase.
 * Run from server/: npm run db:check
 */
import 'dotenv/config'
import pg from 'pg'
import {
  getSslConfig,
  isSupabaseDatabase,
  isSupabaseSslNoVerify,
} from '../src/lib/db-connection.js'

const directUrl = process.env.DIRECT_URL
const databaseUrl = process.env.DATABASE_URL

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.password) u.password = '***'
    return u.toString()
  } catch {
    return '(invalid URL)'
  }
}

function parseHints(url: string | undefined): string[] {
  if (!url) return ['(not set)']
  const hints: string[] = []
  try {
    const u = new URL(url)
    hints.push(`host=${u.hostname}`)
    hints.push(`port=${u.port || '5432'}`)
    hints.push(`user=${u.username}`)
    if (u.hostname.startsWith('db.') && u.port === '6543') {
      hints.push('WARN: db.* host with port 6543 is invalid — use pooler host for 6543')
    }
    if (u.hostname.includes('pooler.') && u.port === '6543' && !u.username.includes('.')) {
      hints.push('WARN: transaction pooler should use user postgres.[project-ref]')
    }
    if (u.hostname.includes('pooler.') && u.port === '6543' && !u.searchParams.has('pgbouncer')) {
      hints.push('WARN: add ?pgbouncer=true for Prisma transaction pooler (DATABASE_URL)')
    }
    if (u.hostname.startsWith('db.') && u.port === '5432' && u.username.includes('.')) {
      hints.push('WARN: direct db.* host usually uses user postgres, not postgres.[ref]')
    }
  } catch {
    hints.push('invalid URL')
  }
  return hints
}

async function probe(label: string, url: string | undefined): Promise<void> {
  console.log(`\n--- ${label} ---`)
  if (!url) {
    console.log('not set')
    return
  }
  console.log(maskUrl(url))
  for (const h of parseHints(url)) console.log(`  ${h}`)

  const client = new pg.Client({
    connectionString: url,
    ssl: getSslConfig(),
    connectionTimeoutMillis: 15_000,
  })
  try {
    await client.connect()
    const tables = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 20`
    )
    console.log(`  OK — connected; public tables (${tables.rowCount} shown):`)
    for (const row of tables.rows) console.log(`    - ${row.tablename}`)
    if (tables.rowCount === 0) {
      console.log('  (no tables — run: npx prisma db push)')
    }
  } catch (err) {
    console.error('  FAILED —', err instanceof Error ? err.message : err)
  } finally {
    await client.end().catch(() => {})
  }
}

console.log('[db:check] Supabase project ref from env hosts (compare to dashboard)')
if (isSupabaseDatabase()) console.log('  detected Supabase URL in env')
if (isSupabaseSslNoVerify()) {
  console.log('  SUPABASE_SSL_NO_VERIFY=true (TLS verification disabled for local dev)')
}

await probe('DIRECT_URL (use for prisma db push)', directUrl)
await probe('DATABASE_URL (use on Vercel runtime)', databaseUrl)
