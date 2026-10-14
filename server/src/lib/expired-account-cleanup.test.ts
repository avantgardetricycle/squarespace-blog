import assert from 'node:assert/strict'
import test from 'node:test'
import { accountReadyForDeletion } from './expired-account-cleanup.js'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-10-13T16:00:00.000Z')

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * DAY)
}

test('a subscription canceled more than 90 days ago is ready for deletion', () => {
  assert.equal(
    accountReadyForDeletion([{ status: 'canceled', source: 'stripe', currentPeriodEnd: daysAgo(91) }], now),
    true
  )
})

test('a subscription canceled 90 days ago is kept', () => {
  assert.equal(
    accountReadyForDeletion([{ status: 'canceled', source: 'stripe', currentPeriodEnd: daysAgo(90) }], now),
    false
  )
})

test('a newer canceled subscription keeps the account', () => {
  assert.equal(
    accountReadyForDeletion(
      [
        { status: 'canceled', source: 'stripe', currentPeriodEnd: daysAgo(200) },
        { status: 'canceled', source: 'stripe', currentPeriodEnd: daysAgo(10) },
      ],
      now
    ),
    false
  )
})

test('an active or past-due subscription keeps the account', () => {
  const old = { status: 'canceled', source: 'stripe', currentPeriodEnd: daysAgo(120) }
  assert.equal(
    accountReadyForDeletion([old, { status: 'active', source: 'stripe', currentPeriodEnd: daysAgo(1) }], now),
    false
  )
  assert.equal(
    accountReadyForDeletion(
      [old, { status: 'past_due', source: 'stripe', paymentFailedAt: daysAgo(100), currentPeriodEnd: daysAgo(100) }],
      now
    ),
    false
  )
})

test('an expired beta grant older than 90 days is ready for deletion', () => {
  assert.equal(
    accountReadyForDeletion(
      [{ status: 'active', source: 'beta', currentPeriodEnd: daysAgo(100) }],
      now
    ),
    true
  )
})

test('a beta grant that has not ended is kept', () => {
  assert.equal(
    accountReadyForDeletion(
      [{ status: 'active', source: 'beta', currentPeriodEnd: new Date(now.getTime() + DAY) }],
      now
    ),
    false
  )
})

test('a canceled subscription with no end date is kept', () => {
  assert.equal(
    accountReadyForDeletion([{ status: 'canceled', source: 'stripe', currentPeriodEnd: null }], now),
    false
  )
})
