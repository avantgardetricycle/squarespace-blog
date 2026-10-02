import assert from 'node:assert/strict'
import test from 'node:test'
import { decideAnonymousCommentIdentity, finalizeCommentIdentity } from './anonymous-comment-identity.js'

const base = {
  allowAnonymousComments: true,
  subscriberCommentsEnabled: false,
  displayNameRaw: '',
  anonymousHandleRaw: '',
  email: null as string | null,
  postAsAnonymous: false,
}

test('verification off ignores a typed name and email', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    displayNameRaw: 'Jane Doe',
    email: 'jane@example.com',
  })
  assert.equal(decision.useAnonymousIdentity, true)
  assert.equal(decision.generatedHandle, null)
  assert.equal(decision.memberEmailAttempt, false)

  const saved = finalizeCommentIdentity({
    useAnonymousIdentity: decision.useAnonymousIdentity,
    generatedHandle: decision.generatedHandle,
    displayName: 'Jane Doe',
    email: 'jane@example.com',
    verifiedSubscriber: false,
    squarespaceProfileId: null,
  })
  assert.deepEqual(saved, {
    displayName: 'Anonymous',
    email: null,
    verifiedSubscriber: false,
    squarespaceProfileId: null,
  })
})

test('a session handle is stored and the email is dropped', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    subscriberCommentsEnabled: true,
    displayNameRaw: 'Anonymous4321',
    email: 'member@example.com',
  })
  assert.equal(decision.generatedHandle, 'Anonymous4321')
  assert.equal(decision.useAnonymousIdentity, true)
  assert.equal(decision.memberEmailAttempt, false)

  const saved = finalizeCommentIdentity({
    useAnonymousIdentity: true,
    generatedHandle: decision.generatedHandle,
    displayName: 'Anonymous4321',
    email: 'member@example.com',
    verifiedSubscriber: true,
    squarespaceProfileId: 'profile-1',
  })
  assert.equal(saved.displayName, 'Anonymous4321')
  assert.equal(saved.email, null)
  assert.equal(saved.verifiedSubscriber, false)
  assert.equal(saved.squarespaceProfileId, null)
})

test('anonymous_handle wins over a typed display name', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    displayNameRaw: 'Jane Doe',
    anonymousHandleRaw: 'Anonymous1111',
  })
  assert.equal(decision.generatedHandle, 'Anonymous1111')
})

test('handles must be Anonymous plus exactly four digits', () => {
  for (const displayNameRaw of ['anonymous1234', 'Anonymous123', 'Anonymous12345', 'Anonymous 1234']) {
    const decision = decideAnonymousCommentIdentity({ ...base, displayNameRaw })
    assert.equal(decision.generatedHandle, null, displayNameRaw)
  }
})

test('member email confirmation still runs when verification is on and no handle is sent', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    subscriberCommentsEnabled: true,
    email: 'member@example.com',
  })
  assert.equal(decision.useAnonymousIdentity, false)
  assert.equal(decision.memberEmailAttempt, true)
})

test('commenting anonymously from the member modal stays the plain Anonymous fallback', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    subscriberCommentsEnabled: true,
    postAsAnonymous: true,
    email: 'member@example.com',
  })
  assert.equal(decision.useAnonymousIdentity, false)
  assert.equal(decision.memberEmailAttempt, false)

  const saved = finalizeCommentIdentity({
    useAnonymousIdentity: false,
    generatedHandle: null,
    displayName: '',
    email: 'member@example.com',
    verifiedSubscriber: false,
    squarespaceProfileId: null,
  })
  assert.equal(saved.displayName, 'Anonymous')
  assert.equal(saved.email, null)
  assert.equal(saved.verifiedSubscriber, false)
})

test('a verified member keeps their name and email', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    allowAnonymousComments: false,
    subscriberCommentsEnabled: true,
    email: 'member@example.com',
  })
  assert.equal(decision.useAnonymousIdentity, false)

  const saved = finalizeCommentIdentity({
    useAnonymousIdentity: false,
    generatedHandle: null,
    displayName: 'Jane',
    email: 'member@example.com',
    verifiedSubscriber: true,
    squarespaceProfileId: 'profile-1',
  })
  assert.deepEqual(saved, {
    displayName: 'Jane',
    email: 'member@example.com',
    verifiedSubscriber: true,
    squarespaceProfileId: 'profile-1',
  })
})

test('an unverified freeform name is not stored when anonymous comments are on and verification is on', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    subscriberCommentsEnabled: true,
    displayNameRaw: 'Jane Doe',
    email: 'not-a-member@example.com',
  })
  assert.equal(decision.useAnonymousIdentity, false)
  assert.equal(decision.generatedHandle, null)

  const saved = finalizeCommentIdentity({
    useAnonymousIdentity: false,
    generatedHandle: null,
    displayName: 'Jane Doe',
    email: 'not-a-member@example.com',
    verifiedSubscriber: false,
    squarespaceProfileId: null,
  })
  assert.equal(saved.displayName, 'Anonymous')
  assert.equal(saved.email, null)
})

test('anonymous comments off does not accept a generated handle', () => {
  const decision = decideAnonymousCommentIdentity({
    ...base,
    allowAnonymousComments: false,
    subscriberCommentsEnabled: true,
    displayNameRaw: 'Anonymous1234',
    email: 'member@example.com',
  })
  assert.equal(decision.generatedHandle, null)
  assert.equal(decision.useAnonymousIdentity, false)
  assert.equal(decision.memberEmailAttempt, false)
})
