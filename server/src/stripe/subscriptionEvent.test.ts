import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldApplySubscriptionEvent } from './handlers.js'

test('applies an event for the subscription already stored on the row', () => {
  assert.equal(shouldApplySubscriptionEvent('sub_current', 'sub_current', 'canceled'), true)
})

test('applies an event when the row has no subscription id yet', () => {
  assert.equal(shouldApplySubscriptionEvent(null, 'sub_new', 'canceled'), true)
})

test('a billable event may replace a previous subscription id', () => {
  for (const status of ['trialing', 'active', 'past_due', 'unpaid']) {
    assert.equal(shouldApplySubscriptionEvent('sub_old', 'sub_new', status), true)
  }
})

test('a terminal event for a previous subscription id is ignored', () => {
  assert.equal(shouldApplySubscriptionEvent('sub_current', 'sub_old', 'canceled'), false)
  assert.equal(shouldApplySubscriptionEvent('sub_current', 'sub_old', 'incomplete_expired'), false)
})
