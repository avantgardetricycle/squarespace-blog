import assert from 'node:assert/strict'
import test from 'node:test'
import { isSealedBlogPassword, readBlogPassword, sealBlogPassword } from './blog-password.js'

const KEY = 'a'.repeat(64)

test('blog passwords are stored as ciphertext and round-trip', () => {
  const previous = process.env.ENCRYPTION_KEY
  process.env.ENCRYPTION_KEY = KEY
  try {
    const sealed = sealBlogPassword('hunter2')
    assert.ok(sealed)
    assert.equal(isSealedBlogPassword(sealed), true)
    assert.equal(sealed!.includes('hunter2'), false)
    assert.notEqual(sealed, sealBlogPassword('hunter2'))
    assert.equal(readBlogPassword(sealed), 'hunter2')
  } finally {
    if (previous === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = previous
  }
})

test('blank passwords clear storage and legacy plaintext still reads', () => {
  assert.equal(sealBlogPassword(null), null)
  assert.equal(sealBlogPassword('   '), null)
  assert.equal(readBlogPassword('legacy-secret'), 'legacy-secret')
  assert.equal(readBlogPassword('  legacy-secret  '), 'legacy-secret')
  assert.equal(readBlogPassword(null), null)
  assert.equal(readBlogPassword(''), null)
})
