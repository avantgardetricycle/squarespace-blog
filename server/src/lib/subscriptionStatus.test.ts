import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BETA_CONVERSION_MIN_TRIAL_MS,
  betaConversionTrialEnd,
  canRenderSubscription,
  checkoutBlockReason,
  isInPaymentGrace,
  nextPaymentFailedAt,
  PAYMENT_GRACE_PERIOD_MS,
} from './subscriptionStatus.js'

const failedAt = new Date('2026-10-01T00:00:00.000Z')
const duringGrace = new Date(failedAt.getTime() + PAYMENT_GRACE_PERIOD_MS - 1000)
const afterGrace = new Date(failedAt.getTime() + PAYMENT_GRACE_PERIOD_MS + 1000)

test('a failed payment renders during the 7-day grace window and not after', () => {
  const sub = { status: 'past_due', source: 'stripe', paymentFailedAt: failedAt }
  assert.equal(isInPaymentGrace(sub, duringGrace), true)
  assert.equal(canRenderSubscription(sub, duringGrace), true)
  assert.equal(isInPaymentGrace(sub, afterGrace), false)
  assert.equal(canRenderSubscription(sub, afterGrace), false)
})

test('an active subscription can render and is not in grace', () => {
  const sub = { status: 'active', source: 'stripe', paymentFailedAt: failedAt }
  assert.equal(isInPaymentGrace(sub, duringGrace), false)
  assert.equal(canRenderSubscription(sub, duringGrace), true)
})

test('the failure clock is kept across past_due and unpaid, then cleared on recovery', () => {
  const first = nextPaymentFailedAt({ status: 'active', paymentFailedAt: null }, 'past_due', failedAt)
  assert.equal(first?.toISOString(), failedAt.toISOString())

  const stillFailed = nextPaymentFailedAt(
    { status: 'past_due', paymentFailedAt: failedAt },
    'unpaid',
    afterGrace
  )
  assert.equal(stillFailed?.toISOString(), failedAt.toISOString())

  const recovered = nextPaymentFailedAt(
    { status: 'past_due', paymentFailedAt: failedAt },
    'active',
    afterGrace
  )
  assert.equal(recovered, null)
})

test('an active beta grant can start checkout and keeps the free period as a trial', () => {
  const now = new Date('2026-10-15T00:00:00.000Z')
  const accessUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
  const beta = { status: 'active', source: 'beta', currentPeriodEnd: accessUntil }

  assert.equal(checkoutBlockReason([beta], now), null)
  assert.equal(betaConversionTrialEnd(beta, now)?.toISOString(), accessUntil.toISOString())
})

test('a beta grant ending inside the Stripe trial minimum is billed immediately', () => {
  const now = new Date('2026-10-15T00:00:00.000Z')
  const accessUntil = new Date(now.getTime() + BETA_CONVERSION_MIN_TRIAL_MS - 1000)
  const beta = { status: 'active', source: 'beta', currentPeriodEnd: accessUntil }

  assert.equal(betaConversionTrialEnd(beta, now), null)
})

test('checkout is refused for a live or unpaid Stripe subscription and allowed after cancel', () => {
  const now = new Date('2026-10-15T00:00:00.000Z')
  const beta = {
    status: 'active',
    source: 'beta',
    currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  }

  assert.equal(
    checkoutBlockReason([{ status: 'active', source: 'stripe', currentPeriodEnd: null }, beta], now),
    'active_paid'
  )
  assert.equal(
    checkoutBlockReason([{ status: 'past_due', source: 'stripe', currentPeriodEnd: null }], now),
    'payment_required'
  )
  assert.equal(
    checkoutBlockReason([{ status: 'canceled', source: 'stripe', currentPeriodEnd: null }, beta], now),
    null
  )
})

test('a new failure after recovery starts a new window', () => {
  const again = nextPaymentFailedAt(
    { status: 'active', paymentFailedAt: failedAt },
    'past_due',
    afterGrace
  )
  assert.equal(again?.toISOString(), afterGrace.toISOString())
})
