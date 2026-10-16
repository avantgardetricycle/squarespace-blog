import assert from 'node:assert/strict'
import test from 'node:test'
import { applyVerificationSession } from './comment-verification-session.js'

const session = {
  email: 'sarah@example.com',
  displayName: 'Sarah K.',
  customName: false,
}

test('a typed email is kept and the stored session is not used', () => {
  const applied = applyVerificationSession({
    email: 'reader@example.com',
    session,
  })
  assert.deepEqual(applied, { email: 'reader@example.com' })
})

test('a stored session supplies only the email', () => {
  const applied = applyVerificationSession({
    email: null,
    session: { email: 'pat@example.com', displayName: 'Pat Example', customName: true },
  })
  assert.deepEqual(applied, { email: 'pat@example.com' })
})

test('a missing session does not invent an email', () => {
  const applied = applyVerificationSession({
    email: null,
    session: null,
  })
  assert.equal(applied.email, null)
})
