import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mergePublicPostBody,
  publicPostBody,
  publicPostJsonUrl
} from './squarespace-public-post.js'

const origin = 'https://customer.example'

test('public post JSON url stays on the site origin', () => {
  assert.equal(
    publicPostJsonUrl('https://customer.example/journal', '/journal/hello'),
    'https://customer.example/journal/hello?format=json'
  )
  assert.equal(publicPostJsonUrl('https://customer.example', 'https://evil.example/post'), null)
  assert.equal(publicPostJsonUrl('https://customer.example', '/'), null)
})

test('public post body prefers the item payload', () => {
  assert.equal(publicPostBody({ item: { body: '<p>Full article.</p>' }, items: [{ body: '<p>Other.</p>' }] }), '<p>Full article.</p>')
  assert.equal(publicPostBody({ items: [{ body: '  ' }, { body: '<p>Sibling.</p>' }] }), '<p>Sibling.</p>')
  assert.equal(publicPostBody({ item: { title: 'No body' } }), '')
})

test('merge copies a longer public body and keeps a short listing gated', () => {
  const items: Array<Record<string, unknown>> = [
    { title: 'Hello', fullUrl: 'https://customer.example/journal/hello', urlId: 'hello', body: '' },
    { title: 'Other', fullUrl: '/journal/other', body: '<p>Already public article text that is clearly longer than a teaser.</p>' }
  ]
  const merged = mergePublicPostBody(
    items,
    '/journal/hello',
    { item: { body: '<p>The full public post text lives on the post JSON.</p>' } },
    origin
  )
  assert.equal(merged, true)
  assert.equal(items[0].body, '<p>The full public post text lives on the post JSON.</p>')
  assert.equal(items[0].bbCollectionBodyGated, true)
  assert.equal('bbCollectionBodyGated' in items[1], false)
})

test('merge does not replace a body that is already as long', () => {
  const items: Array<Record<string, unknown>> = [{ fullUrl: '/journal/hello', body: '<p>Same length.</p>' }]
  const merged = mergePublicPostBody(items, '/journal/hello', { item: { body: '<p>Same length.</p>' } }, origin)
  assert.equal(merged, false)
})

test('an explicit public preview stays ungated after merge', () => {
  const items: Array<Record<string, unknown>> = [{ fullUrl: '/journal/hello', body: '', publicPreview: true }]
  mergePublicPostBody(items, '/journal/hello', { item: { body: '<p>Preview readers can read this whole post in the public JSON.</p>' } }, origin)
  assert.equal(items[0].bbCollectionBodyGated, undefined)
})
