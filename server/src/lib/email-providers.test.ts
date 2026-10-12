import assert from 'node:assert/strict'
import test from 'node:test'
import {
  forwardSubscriber,
  mailchimpDatacenter,
  mailchimpSubscriberHash,
  redactSubscriberText,
  testEmailProvider,
  validateDestinationId,
  type FetchLike,
} from './email-providers.js'

const MAILCHIMP_HASH = 'b58996c504c5638798eb6b511e6f49af'

test('mailchimp datacenter comes from the key suffix', () => {
  assert.equal(mailchimpDatacenter('secret-us21'), 'us21')
  assert.equal(mailchimpDatacenter('abc-def-US6'), 'us6')
  assert.equal(mailchimpDatacenter('no-suffix'), null)
  assert.equal(mailchimpDatacenter('missing-'), null)
})

test('mailchimp subscriber hash is the md5 of the lowercase address', () => {
  assert.equal(mailchimpSubscriberHash('User@Example.com'), MAILCHIMP_HASH)
})

test('destination ids are checked before a request', () => {
  assert.equal(validateDestinationId('kit', '42'), null)
  assert.equal(validateDestinationId('kit', 'form-1'), 'Kit form ID should be a number.')
  assert.equal(validateDestinationId('mailchimp', ''), 'Audience ID is required.')
  assert.equal(validateDestinationId('mailchimp', 'abc123def0'), null)
})

test('kit form subscribe posts the address with the API key header', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ subscriber: { id: 1 } }), { status: 200 })
  }

  const result = await forwardSubscriber({
    provider: 'kit',
    apiKey: 'kit-secret',
    destinationId: '42',
    email: 'reader@example.com',
    fetchImpl,
  })

  assert.deepEqual(result, { ok: true })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.kit.com/v4/forms/42/subscribers')
  const headers = new Headers(calls[0].init?.headers)
  assert.equal(headers.get('X-Kit-Api-Key'), 'kit-secret')
  assert.equal(calls[0].init?.method, 'POST')
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { email_address: 'reader@example.com' })
})

test('kit lead magnet subscribe also creates and applies a tag', async () => {
  const calls: string[] = []
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`)
    if (url.includes('/forms/')) {
      return new Response('{}', { status: 201 })
    }
    if (url.startsWith('https://api.kit.com/v4/tags?')) {
      return new Response(JSON.stringify({ tags: [], pagination: { has_next_page: false } }), { status: 200 })
    }
    if (url === 'https://api.kit.com/v4/tags' && init?.method === 'POST') {
      return new Response(JSON.stringify({ tag: { id: 9, name: 'Free guide' } }), { status: 201 })
    }
    if (url === 'https://api.kit.com/v4/tags/9/subscribers') {
      return new Response('{}', { status: 200 })
    }
    return new Response('unexpected', { status: 500 })
  }

  const result = await forwardSubscriber({
    provider: 'kit',
    apiKey: 'kit-secret',
    destinationId: '42',
    email: 'reader@example.com',
    leadMagnetTitle: 'Free guide',
    fetchImpl,
  })

  assert.deepEqual(result, { ok: true })
  assert.deepEqual(calls, [
    'POST https://api.kit.com/v4/forms/42/subscribers',
    'GET https://api.kit.com/v4/tags?per_page=500',
    'POST https://api.kit.com/v4/tags',
    'POST https://api.kit.com/v4/tags/9/subscribers',
  ])
})

test('kit tag failure still counts as a successful subscribe', async () => {
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.includes('/forms/')) return new Response('{}', { status: 200 })
    if (init?.method === 'GET') return new Response(JSON.stringify({ tags: [] }), { status: 200 })
    return new Response(JSON.stringify({ errors: ['tag failed for reader@example.com'] }), { status: 422 })
  }
  const result = await forwardSubscriber({
    provider: 'kit',
    apiKey: 'kit-secret',
    destinationId: '7',
    email: 'reader@example.com',
    leadMagnetTitle: 'Checklist',
    fetchImpl,
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.match(result.warning ?? '', /lead magnet tag/)
    assert.equal((result.warning ?? '').includes('reader@example.com'), false)
    assert.match(result.warning ?? '', /\[email\]/)
  }
})

test('mailchimp member exists is a successful subscribe', async () => {
  const calls: Array<{ url: string; method: string }> = []
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET' })
    return new Response(JSON.stringify({ title: 'Member Exists', detail: 'user@example.com is already on the list' }), {
      status: 400,
    })
  }
  const result = await forwardSubscriber({
    provider: 'mailchimp',
    apiKey: 'secret-us21',
    destinationId: 'abc123def0',
    email: 'User@Example.com',
    fetchImpl,
  })
  assert.deepEqual(result, { ok: true })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].method, 'PUT')
  assert.equal(
    calls[0].url,
    `https://us21.api.mailchimp.com/3.0/lists/abc123def0/members/${MAILCHIMP_HASH}`
  )
})

test('mailchimp subscribe errors redact the address', async () => {
  const fetchImpl: FetchLike = async () =>
    new Response(JSON.stringify({ title: 'Invalid Resource', detail: 'user@example.com is invalid' }), { status: 400 })
  const result = await forwardSubscriber({
    provider: 'mailchimp',
    apiKey: 'secret-us21',
    destinationId: 'abc123def0',
    email: 'user@example.com',
    fetchImpl,
  })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.includes('user@example.com'), false)
    assert.match(result.error, /\[email\]/)
  }
})

test('mailchimp lead magnet adds a tag after subscribe', async () => {
  const calls: string[] = []
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`)
    return new Response('{}', { status: 200 })
  }
  const result = await forwardSubscriber({
    provider: 'mailchimp',
    apiKey: 'secret-us21',
    destinationId: 'abc123def0',
    email: 'user@example.com',
    leadMagnetTitle: 'Free guide',
    fetchImpl,
  })
  assert.deepEqual(result, { ok: true })
  assert.equal(calls[1], `POST https://us21.api.mailchimp.com/3.0/lists/abc123def0/members/${MAILCHIMP_HASH}/tags`)
})

test('test connection checks the kit form and the mailchimp audience', async () => {
  const kit = await testEmailProvider({
    provider: 'kit',
    apiKey: 'kit-secret',
    destinationId: '42',
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.kit.com/v4/forms/42')
      assert.equal(init?.method, 'GET')
      assert.equal(new Headers(init?.headers).get('X-Kit-Api-Key'), 'kit-secret')
      return new Response('{}', { status: 200 })
    },
  })
  assert.deepEqual(kit, { ok: true })

  const mailchimp = await testEmailProvider({
    provider: 'mailchimp',
    apiKey: 'secret-us21',
    destinationId: 'abc123def0',
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://us21.api.mailchimp.com/3.0/lists/abc123def0')
      assert.equal(new Headers(init?.headers).get('Authorization')?.startsWith('Basic '), true)
      return new Response('{}', { status: 401 })
    },
  })
  assert.deepEqual(mailchimp, { ok: false, error: 'Mailchimp rejected this API key.' })
})

test('redactSubscriberText hides addresses', () => {
  assert.equal(redactSubscriberText('nope user@example.com here'), 'nope [email] here')
})
