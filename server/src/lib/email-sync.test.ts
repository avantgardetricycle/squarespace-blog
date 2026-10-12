import assert from 'node:assert/strict'
import test from 'node:test'
import { emailModuleForLead, persistAndForwardLead, selectStoredIntegration, type EmailSyncDeps } from './email-sync.js'

const lead = {
  siteId: 'site-1',
  email: 'reader@example.com',
  name: null,
  type: 'newsletter' as const,
  resourceTitle: '',
}

function deps(overrides: Partial<EmailSyncDeps> = {}): EmailSyncDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    upsertLead: async () => {
      calls.push('upsert')
    },
    loadIntegration: async () => {
      calls.push('load')
      return { provider: 'kit', apiKeyEnc: 'enc', destinationId: '42' }
    },
    saveStatus: async () => {
      calls.push('status')
    },
    forward: async () => {
      calls.push('forward')
      return { ok: true }
    },
    decryptKey: () => 'kit-secret',
    log: () => {},
    ...overrides,
  }
}

test('a legacy destination row without a module is used for post newsletter', () => {
  const stored = selectStoredIntegration(
    [{ provider: 'mailchimp', api_key_enc: 'enc', destination_id: 'audience-1', tag_name: 'Readers' }],
    'post_newsletter'
  )
  assert.equal(stored?.provider, 'mailchimp')
  assert.equal(stored?.apiKeyEnc, 'enc')
  assert.equal(stored?.destinationId, 'audience-1')
  assert.equal(stored?.tagName, 'Readers')
})

test('per-module rows do not share another module destination', () => {
  const rows = [
    { module: 'collection_newsletter', provider: 'mailchimp', api_key_enc: 'enc', destination_id: 'audience-1' },
    { module: 'post_newsletter', provider: 'kit', api_key_enc: 'enc', destination_id: 'form-9', destination_kind: 'form' },
  ]
  const post = selectStoredIntegration(rows, 'post_newsletter')
  assert.equal(post?.provider, 'kit')
  assert.equal(post?.destinationId, 'form-9')
  assert.equal(selectStoredIntegration(rows, 'post_lead_magnet'), null)
})

test('signup modules keep collection and post destinations apart', () => {
  assert.equal(emailModuleForLead('newsletter', 'collection'), 'collection_newsletter')
  assert.equal(emailModuleForLead('newsletter', 'post'), 'post_newsletter')
  assert.equal(emailModuleForLead('lead_magnet', 'collection'), 'collection_lead_magnet')
  assert.equal(emailModuleForLead('lead_magnet', 'post'), 'post_lead_magnet')
})

test('a failed provider call still keeps the local lead and records lastError', async () => {
  let recorded: { lastError: string | null } | null = null
  const harness = deps({
    forward: async () => {
      harness.calls.push('forward')
      return { ok: false, error: 'Kit rejected this API key.' }
    },
    saveStatus: async (_siteId, _module, status) => {
      harness.calls.push('status')
      recorded = { lastError: status.lastError }
    },
  })

  await persistAndForwardLead(lead, harness)

  assert.deepEqual(harness.calls, ['upsert', 'load', 'forward', 'status'])
  assert.deepEqual(recorded, { lastError: 'Kit rejected this API key.' })
})

test('a thrown provider error is recorded without the address and does not reject', async () => {
  let recorded: string | null = null
  const harness = deps({
    forward: async () => {
      throw new Error('network down for reader@example.com')
    },
    saveStatus: async (_siteId, _module, status) => {
      recorded = status.lastError
    },
  })

  await persistAndForwardLead(lead, harness)
  const message = recorded ?? ''
  assert.equal(message.includes('reader@example.com'), false)
  assert.match(message, /\[email\]/)
})

test('upsert failure skips the provider call', async () => {
  let forwarded = false
  const harness = deps({
    upsertLead: async () => {
      throw new Error('db down')
    },
    forward: async () => {
      forwarded = true
      return { ok: true }
    },
  })

  await assert.rejects(() => persistAndForwardLead(lead, harness), /db down/)
  assert.equal(forwarded, false)
})

test('betterblog does not call the provider', async () => {
  let forwarded = false
  const harness = deps({
    loadIntegration: async () => ({ provider: 'betterblog', apiKeyEnc: 'enc', destinationId: '42' }),
    forward: async () => {
      forwarded = true
      return { ok: true }
    },
  })
  await persistAndForwardLead(lead, harness)
  assert.equal(forwarded, false)
})
