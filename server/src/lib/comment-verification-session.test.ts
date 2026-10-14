import assert from 'node:assert/strict'
import test from 'node:test'
import { applyVerificationSession } from './comment-verification-session.js'

const session = {
  email: 'sarah@example.com',
  displayName: 'Sarah K.',
  customName: false,
}

test('a typed email and name are kept and the stored session is not used', () => {
  const applied = applyVerificationSession({
    email: 'reader@example.com',
    subscriberDisplayName: 'Pat Example',
    session,
  })
  assert.deepEqual(applied, {
    email: 'reader@example.com',
    subscriberDisplayName: 'Pat Example',
    customName: true,
  })
})

test('a typed email with a blank name stays blank so the profile name can be built', () => {
  const applied = applyVerificationSession({
    email: 'sarah@example.com',
    subscriberDisplayName: '  ',
    session: { ...session, customName: true, displayName: 'Pat Example' },
  })
  assert.equal(applied.email, 'sarah@example.com')
  assert.equal(applied.subscriberDisplayName, '')
  assert.equal(applied.customName, false)
})

test('a stored custom name is restored with the stored email', () => {
  const applied = applyVerificationSession({
    email: null,
    subscriberDisplayName: '',
    session: { email: 'pat@example.com', displayName: 'Pat Example', customName: true },
  })
  assert.deepEqual(applied, {
    email: 'pat@example.com',
    subscriberDisplayName: 'Pat Example',
    customName: true,
  })
})

test('a stored profile session supplies the email and leaves the name blank', () => {
  const applied = applyVerificationSession({
    email: null,
    subscriberDisplayName: '',
    session,
  })
  assert.equal(applied.email, 'sarah@example.com')
  assert.equal(applied.subscriberDisplayName, '')
  assert.equal(applied.customName, false)
})

test('a missing session does not invent an email', () => {
  const applied = applyVerificationSession({
    email: null,
    subscriberDisplayName: '',
    session: null,
  })
  assert.equal(applied.email, null)
  assert.equal(applied.customName, false)
})
