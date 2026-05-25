/**
 * Idempotent seed for `plans` (Stripe price IDs per environment).
 *
 * Usage (from repo root or server/):
 *   npm run db:seed-plans --workspace=server
 *   npm run db:seed-plans --workspace=server -- --environment=sandbox
 *   npm run db:seed-plans --workspace=server -- --environment=live
 *
 * Requires DATABASE_URL in server/.env (or env). Uses DIRECT_URL when set for Prisma CLI parity.
 */
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { getDatabaseUrl, getSslConfig } from '../src/lib/db-connection.js'
import { parsePlanSeedEnvironments, seedPlans } from '../src/lib/plan-seed-data.js'

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: getSslConfig(),
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main(): Promise<void> {
  const environments = parsePlanSeedEnvironments(process.argv.slice(2))
  const results = await seedPlans(prisma, environments)

  for (const { environment, upserted } of results) {
    console.log(`Seeded ${upserted} plan row(s) for stripe_environment=${environment}`)
  }
  console.log('Plan seed completed')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
