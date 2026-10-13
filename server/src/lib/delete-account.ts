import Stripe from 'stripe'
import prisma from '../db/index.js'
import { usableStripeCustomerId } from './subscriptionStatus.js'
import {
  AUTHOR_PHOTOS_BUCKET,
  getSupabaseStorageClient,
  isAuthorPhotoStorageConfigured,
} from './supabase-storage.js'
import { SUPPORT_SCREENSHOTS_BUCKET } from './support-screenshots.js'

const STORAGE_LIST_PAGE = 100
let loggedMissingStorage = false

export class AccountDeletionError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'AccountDeletionError'
    this.statusCode = statusCode
  }
}

export type AccountForDeletion = {
  id: number
  email: string
  stripeCustomerId: string | null
  sites: { id: string }[]
  subscriptions: { stripeCustomerId: string }[]
}

export type AccountPurgeClient = {
  checkoutSession: {
    deleteMany: (args: {
      where: { OR: Array<{ userId: number } | { email: string }> }
    }) => Promise<unknown>
  }
  customerLead: {
    deleteMany: (args: { where: { email: string } }) => Promise<unknown>
  }
  user: {
    delete: (args: { where: { id: number } }) => Promise<unknown>
  }
}

export type DeleteAccountDeps = {
  findUser: (userId: number) => Promise<AccountForDeletion | null>
  deleteStripeCustomer: (customerId: string) => Promise<void>
  removeStoragePrefix: (bucket: string, prefix: string) => Promise<void>
  transaction: (fn: (tx: AccountPurgeClient) => Promise<void>) => Promise<void>
  log: (message: string, err?: unknown) => void
}

export function emailsMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

/** Real Stripe customer ids only. Synthetic beta_ ids are skipped, and duplicates collapse. */
export function stripeCustomerIdsForUser(user: AccountForDeletion): string[] {
  const ids = new Set<string>()
  const fromUser = usableStripeCustomerId(user.stripeCustomerId)
  if (fromUser) ids.add(fromUser)
  for (const subscription of user.subscriptions) {
    const id = usableStripeCustomerId(subscription.stripeCustomerId)
    if (id) ids.add(id)
  }
  return [...ids]
}

export function isMissingStripeCustomer(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = 'code' in err ? (err as { code?: unknown }).code : undefined
  return code === 'resource_missing' || code === 'resource_missing_deleted'
}

export async function purgeAccountRows(
  tx: AccountPurgeClient,
  user: { id: number; email: string }
): Promise<void> {
  await tx.checkoutSession.deleteMany({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
  })
  await tx.customerLead.deleteMany({ where: { email: user.email } })
  await tx.user.delete({ where: { id: user.id } })
}

export async function removeStoragePrefix(bucket: string, prefix: string): Promise<void> {
  if (!prefix || prefix.includes('..') || prefix.includes('/')) return
  if (!isAuthorPhotoStorageConfigured()) {
    if (!loggedMissingStorage) {
      loggedMissingStorage = true
      console.error('[delete-account] storage is not configured; uploaded files were not removed')
    }
    return
  }

  const supabase = getSupabaseStorageClient()
  const paths: string[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: STORAGE_LIST_PAGE,
      offset,
    })
    if (error) throw error
    const entries = data ?? []
    for (const entry of entries) {
      if (!entry.name || entry.id == null) continue
      paths.push(`${prefix}/${entry.name}`)
    }
    if (entries.length < STORAGE_LIST_PAGE) break
    offset += entries.length
  }

  for (let i = 0; i < paths.length; i += STORAGE_LIST_PAGE) {
    const chunk = paths.slice(i, i + STORAGE_LIST_PAGE)
    const { error } = await supabase.storage.from(bucket).remove(chunk)
    if (error) throw error
  }
}

function defaultDeps(): DeleteAccountDeps {
  return {
    findUser: (userId) =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          stripeCustomerId: true,
          sites: { select: { id: true } },
          subscriptions: { select: { stripeCustomerId: true } },
        },
      }),
    deleteStripeCustomer: async (customerId) => {
      const key = process.env.STRIPE_SECRET_KEY
      if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
      const stripe = new Stripe(key)
      await stripe.customers.del(customerId)
    },
    removeStoragePrefix,
    transaction: async (fn) => {
      await prisma.$transaction(async (tx) => {
        await fn(tx as unknown as AccountPurgeClient)
      })
    },
    log: (message, err) => {
      console.error(message, err)
    },
  }
}

async function removeStorageBestEffort(
  deps: DeleteAccountDeps,
  bucket: string,
  prefix: string
): Promise<void> {
  try {
    await deps.removeStoragePrefix(bucket, prefix)
  } catch (err) {
    deps.log(`[delete-account] storage cleanup failed for ${bucket}/${prefix}`, err)
  }
}

export async function deleteUserAccount(
  input: { userId: number; confirmEmail: string },
  deps: DeleteAccountDeps = defaultDeps()
): Promise<void> {
  const user = await deps.findUser(input.userId)
  if (!user) {
    throw new AccountDeletionError('Account not found', 404)
  }
  if (typeof input.confirmEmail !== 'string' || !emailsMatch(input.confirmEmail, user.email)) {
    throw new AccountDeletionError('Email confirmation does not match', 400)
  }

  for (const customerId of stripeCustomerIdsForUser(user)) {
    try {
      await deps.deleteStripeCustomer(customerId)
    } catch (err) {
      if (isMissingStripeCustomer(err)) continue
      throw new AccountDeletionError(
        'Could not cancel billing. Your account was not deleted.',
        502
      )
    }
  }

  for (const site of user.sites) {
    await removeStorageBestEffort(deps, AUTHOR_PHOTOS_BUCKET, site.id)
  }
  await removeStorageBestEffort(deps, SUPPORT_SCREENSHOTS_BUCKET, String(user.id))

  await deps.transaction(async (tx) => {
    await purgeAccountRows(tx, user)
  })
}
