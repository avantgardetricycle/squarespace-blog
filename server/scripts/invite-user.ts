/**
 * Create (or reuse) a user, grant complimentary access when they have none,
 * and email the same magic-link invite sent after checkout.
 *
 * Used by .github/workflows/invite-user.yml. Requires DATABASE_URL, APP_URL,
 * SENDGRID_API_KEY, and INVITE_EMAIL.
 */
import 'dotenv/config'
import { createHash } from 'crypto'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { getDatabaseUrl, getSslConfig } from '../src/lib/db-connection.js'
import { generateToken, hashToken } from '../src/lib/auth.js'
import { sendInviteEmailViaSendGrid } from '../src/lib/email.js'
import { isActiveSubscriptionStatus } from '../src/lib/subscriptionStatus.js'
import type { StripePlanEnvironment } from '../src/lib/stripeEnvironment.js'

const TOKEN_EXPIRY_HOURS = 24
const COMPLIMENTARY_PLAN = 'professional'

function normalizeEmail (raw: string | undefined): string {
  const email = raw?.trim().toLowerCase() ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('INVITE_EMAIL must be a valid email address')
  }
  return email
}

function requireHttpsAppUrl (): void {
  const raw = process.env.APP_URL?.trim() ?? ''
  if (!raw) {
    throw new Error('APP_URL is required')
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('APP_URL is not a valid URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('APP_URL must use https')
  }
  process.env.APP_URL = raw.replace(/\/$/, '')
}

function stripeEnvironment (): StripePlanEnvironment {
  return process.env.INVITE_STRIPE_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
}

function complimentaryCustomerId (email: string): string {
  const hash = createHash('sha256').update(email).digest('hex').slice(0, 24)
  return `beta_invite_${hash}`
}

async function complimentaryMaxSites (prisma: PrismaClient): Promise<number | null> {
  const plan = await prisma.plan.findFirst({
    where: {
      planKey: COMPLIMENTARY_PLAN,
      cadence: 'monthly',
      stripeEnvironment: stripeEnvironment()
    }
  })
  return plan?.maxSites ?? 3
}

async function main (): Promise<void> {
  if (!process.env.SENDGRID_API_KEY?.trim()) {
    throw new Error('SENDGRID_API_KEY is required')
  }
  requireHttpsAppUrl()

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: getSslConfig()
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    await invite(prisma)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

async function invite (prisma: PrismaClient): Promise<void> {
  const email = normalizeEmail(process.env.INVITE_EMAIL)
  const environmentLabel = process.env.INVITE_ENVIRONMENT?.trim() || 'unknown'

  const existingUser = await prisma.user.findUnique({ where: { email } })
  const user = existingUser ?? await prisma.user.create({ data: { email } })

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.id }
  })
  const alreadyActive = subscriptions.some((subscription) => isActiveSubscriptionStatus(subscription.status))

  if (!alreadyActive) {
    const maxSites = await complimentaryMaxSites(prisma)
    await prisma.subscription.upsert({
      where: { stripeCustomerId: complimentaryCustomerId(email) },
      create: {
        userId: user.id,
        stripeCustomerId: complimentaryCustomerId(email),
        plan: COMPLIMENTARY_PLAN,
        status: 'active',
        maxSites
      },
      update: {
        userId: user.id,
        plan: COMPLIMENTARY_PLAN,
        status: 'active',
        maxSites,
        cancelAtPeriodEnd: false
      }
    })
    const siteLimit = maxSites === null ? 'unlimited sites' : `${maxSites} site${maxSites === 1 ? '' : 's'}`
    console.log(`Granted complimentary ${COMPLIMENTARY_PLAN} access (${siteLimit})`)
  } else {
    console.log('User already has an active subscription; access was left unchanged')
  }

  const rawToken = generateToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS)

  await prisma.loginToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
      purpose: 'invite'
    }
  })

  const appUrl = process.env.APP_URL!.replace(/\/$/, '')
  const magicLink = `${appUrl}/api/auth/magic?token=${rawToken}`
  await sendInviteEmailViaSendGrid(email, magicLink)

  console.log(`${existingUser ? 'Re-invited' : 'Invited'} ${email} on ${environmentLabel}`)
  console.log(`Invite email sent. The link expires in ${TOKEN_EXPIRY_HOURS} hours.`)
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
