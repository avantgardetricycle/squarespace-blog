import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatTrialEndDate,
  isEnteringTrialDayFour,
  resolveTrialEndDate,
  trialReminderLoginUrl,
} from './trial-day-reminder.js'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-10-13T23:59:00.000Z')

test('day 4 is the 24 hours after three full days on trial', () => {
  assert.equal(isEnteringTrialDayFour(new Date(now.getTime() - 3 * DAY), now), true)
  assert.equal(isEnteringTrialDayFour(new Date(now.getTime() - 3 * DAY + 1), now), false)
  assert.equal(isEnteringTrialDayFour(new Date(now.getTime() - 4 * DAY + 1), now), true)
  assert.equal(isEnteringTrialDayFour(new Date(now.getTime() - 4 * DAY), now), false)
  assert.equal(isEnteringTrialDayFour(new Date(now.getTime() - 2 * DAY), now), false)
  assert.equal(isEnteringTrialDayFour(new Date(now.getTime() - 5 * DAY), now), false)
})

test('trial end prefers the stored period end and otherwise adds seven days', () => {
  const started = new Date('2026-10-10T15:00:00.000Z')
  const stored = new Date('2026-10-17T15:00:00.000Z')
  assert.equal(resolveTrialEndDate(stored, started)?.toISOString(), stored.toISOString())
  assert.equal(
    resolveTrialEndDate(null, started)?.toISOString(),
    new Date(started.getTime() + 7 * DAY).toISOString()
  )
})

test('trial end date is the UTC calendar date', () => {
  assert.equal(formatTrialEndDate(new Date('2026-10-20T00:30:00.000Z')), 'October 20, 2026')
  assert.equal(formatTrialEndDate(new Date('2026-10-20T23:30:00.000Z')), 'October 20, 2026')
})

test('reminder links to the login page and returns to account', () => {
  assert.equal(
    trialReminderLoginUrl('https://betterblog.co/'),
    'https://betterblog.co/login?returnTo=%2Fdashboard%2Faccount'
  )
})
