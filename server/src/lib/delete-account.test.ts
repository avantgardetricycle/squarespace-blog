import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AccountDeletionError,
  deleteUserAccount,
  purgeAccountRows,
  type AccountForDeletion,
  type AccountPurgeClient,
  type DeleteAccountDeps,
} from './delete-account.js'
import { AUTHOR_PHOTOS_BUCKET } from './supabase-storage.js'
import { SUPPORT_SCREENSHOTS_BUCKET } from './support-screenshots.js'

const user: AccountForDeletion = {
  id: 7,
  email: 'owner@example.com',
  stripeCustomerId: 'cus_user',
  sites: [{ id: 'site-a' }, { id: 'site-b' }],
  subscriptions: [{ stripeCustomerId: 'cus_user' }, { stripeCustomerId: 'beta_grant' }],
}

function harness(overrides: Partial<DeleteAccountDeps> = {}) {
  const calls: string[] = []
  const deletedCustomers: string[] = []
  const storage: string[] = []
  const purged: string[] = []
  const deps: DeleteAccountDeps = {
    findUser: async () => user,
    deleteStripeCustomer: async (customerId) => {
      calls.push(`stripe:${customerId}`)
      deletedCustomers.push(customerId)
    },
    removeStoragePrefix: async (bucket, prefix) => {
      calls.push(`storage:${bucket}/${prefix}`)
      storage.push(`${bucket}/${prefix}`)
    },
    transaction: async (fn) => {
      calls.push('transaction')
      const tx: AccountPurgeClient = {
        checkoutSession: {
          deleteMany: async (args) => {
            purged.push(`checkout:${JSON.stringify(args.where)}`)
          },
        },
        customerLead: {
          deleteMany: async (args) => {
            purged.push(`lead:${args.where.email}`)
          },
        },
        user: {
          delete: async (args) => {
            purged.push(`user:${args.where.id}`)
          },
        },
      }
      await fn(tx)
    },
    log: () => {
      calls.push('log')
    },
    ...overrides,
  }
  return { deps, calls, deletedCustomers, storage, purged }
}

test('email mismatch does not call Stripe or delete', async () => {
  const { deps, calls } = harness()
  await assert.rejects(
    () => deleteUserAccount({ userId: user.id, confirmEmail: 'other@example.com' }, deps),
    (err: unknown) => {
      assert.ok(err instanceof AccountDeletionError)
      assert.equal(err.statusCode, 400)
      return true
    }
  )
  assert.deepEqual(calls, [])
})

test('a Stripe customer is deleted and a beta id is not', async () => {
  const { deps, deletedCustomers, calls } = harness()
  await deleteUserAccount({ userId: user.id, confirmEmail: 'Owner@Example.com' }, deps)
  assert.deepEqual(deletedCustomers, ['cus_user'])
  assert.equal(calls.filter((call) => call.startsWith('stripe:')).length, 1)
  assert.ok(calls.indexOf('stripe:cus_user') < calls.indexOf('transaction'))
})

test('a missing Stripe customer still deletes the account', async () => {
  const { deps, calls } = harness({
    deleteStripeCustomer: async () => {
      calls.push('stripe')
      const err = new Error('No such customer') as Error & { code: string }
      err.code = 'resource_missing'
      throw err
    },
  })
  await deleteUserAccount({ userId: user.id, confirmEmail: user.email }, deps)
  assert.ok(calls.includes('transaction'))
})

test('a Stripe failure other than a missing customer does not delete the user', async () => {
  const { deps, calls } = harness({
    deleteStripeCustomer: async () => {
      calls.push('stripe')
      throw new Error('stripe down')
    },
  })
  await assert.rejects(
    () => deleteUserAccount({ userId: user.id, confirmEmail: user.email }, deps),
    (err: unknown) => {
      assert.ok(err instanceof AccountDeletionError)
      assert.equal(err.statusCode, 502)
      return true
    }
  )
  assert.deepEqual(calls, ['stripe'])
})

test('checkout sessions and customer leads are deleted, then the user', async () => {
  const order: string[] = []
  const tx: AccountPurgeClient = {
    checkoutSession: {
      deleteMany: async (args) => {
        order.push('checkout')
        assert.deepEqual(args.where, {
          OR: [{ userId: 7 }, { email: 'owner@example.com' }],
        })
      },
    },
    customerLead: {
      deleteMany: async (args) => {
        order.push('lead')
        assert.equal(args.where.email, 'owner@example.com')
      },
    },
    user: {
      delete: async (args) => {
        order.push('user')
        assert.equal(args.where.id, 7)
      },
    },
  }
  await purgeAccountRows(tx, { id: 7, email: 'owner@example.com' })
  assert.deepEqual(order, ['checkout', 'lead', 'user'])
})

test('storage cleanup runs per site and user, and a storage failure still deletes the account', async () => {
  const { deps, calls, storage } = harness({
    removeStoragePrefix: async (bucket, prefix) => {
      calls.push(`storage:${bucket}/${prefix}`)
      storage.push(`${bucket}/${prefix}`)
      throw new Error('storage unavailable')
    },
  })
  await deleteUserAccount({ userId: user.id, confirmEmail: user.email }, deps)
  assert.deepEqual(storage, [
    `${AUTHOR_PHOTOS_BUCKET}/site-a`,
    `${AUTHOR_PHOTOS_BUCKET}/site-b`,
    `${SUPPORT_SCREENSHOTS_BUCKET}/7`,
  ])
  assert.equal(calls.filter((call) => call === 'log').length, 3)
  const stripeAt = calls.indexOf('stripe:cus_user')
  const firstStorage = calls.findIndex((call) => call.startsWith('storage:'))
  const transactionAt = calls.indexOf('transaction')
  assert.ok(stripeAt >= 0 && firstStorage > stripeAt && transactionAt > firstStorage)
})
